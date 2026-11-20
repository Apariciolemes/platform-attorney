import {
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { serveFile, StorageDisk } from '@nestjs/storage';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ErrorResponseDto } from '../../../shared/infrastructure/http/error-response.dto.js';
import { DeleteRecordingUseCase } from '../../application/use-cases/delete-recording.use-case.js';
import { GetRecordingUseCase } from '../../application/use-cases/get-recording.use-case.js';
import { ListRecordingsUseCase } from '../../application/use-cases/list-recordings.use-case.js';
import { RetryRecordingUseCase } from '../../application/use-cases/retry-recording.use-case.js';
import { UploadRecordingUseCase } from '../../application/use-cases/upload-recording.use-case.js';
import { RecordingResponseDto } from './dto/recording-response.dto.js';
import { UploadRecordingDto } from './dto/upload-recording.dto.js';
import { presentRecording } from './recording.presenter.js';

/** Limite de arquivo da API de transcrição (OpenAI e Groq aceitam até 25 MB). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Áudio, ou contêiner de vídeo que costuma carregar só áudio (mp4/webm). */
export const AUDIO_MEDIA_TYPE = /^(audio\/|video\/(mp4|webm)\b)/;

const RecordingIdParam = () =>
  ApiParam({ name: 'id', format: 'uuid', description: 'Id da gravação' });

/** Adapter de entrada HTTP: valida a requisição, chama o caso de uso e formata a resposta. */
@ApiTags('recordings')
@Controller('recordings')
export class RecordingsController {
  constructor(
    private readonly listRecordings: ListRecordingsUseCase,
    private readonly getRecording: GetRecordingUseCase,
    private readonly uploadRecording: UploadRecordingUseCase,
    private readonly retryRecording: RetryRecordingUseCase,
    private readonly deleteRecording: DeleteRecordingUseCase,
    private readonly disk: StorageDisk,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Lista as gravações, da mais recente à mais antiga',
  })
  @ApiOkResponse({ type: [RecordingResponseDto] })
  async findAll(): Promise<RecordingResponseDto[]> {
    const recordings = await this.listRecordings.execute();
    return recordings.map(presentRecording);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Busca uma gravação',
    description:
      'Use para acompanhar a transcrição: o status vai de pending a completed (ou failed).',
  })
  @RecordingIdParam()
  @ApiOkResponse({ type: RecordingResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RecordingResponseDto> {
    return presentRecording(await this.getRecording.execute(id));
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  @ApiOperation({
    summary: 'Envia um áudio para transcrição',
    description:
      'Guarda o arquivo, cria a gravação com status pending e agenda a transcrição em segundo plano.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadRecordingDto })
  @ApiCreatedResponse({ type: RecordingResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Arquivo ausente ou que não é áudio',
  })
  @ApiPayloadTooLargeResponse({
    type: ErrorResponseDto,
    description: 'Arquivo acima de 25 MB',
  })
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({
            // O tipo é detectado pelo conteúdo (magic bytes). Contêineres mp4/webm também
            // carregam áudio: o WhatsApp Web baixa áudios como .mp4 e o gravador do navegador
            // gera webm, ambos detectados como video/*.
            fileType: AUDIO_MEDIA_TYPE,
            // Grava o tipo detectado, não o declarado pelo navegador (ex.: "video/mp4" de um M4A).
            overrideMimeType: true,
            // Só usado se o conteúdo não for reconhecido.
            fallbackToMimetype: true,
            errorMessage:
              'Envie um arquivo de áudio (mp3, m4a, wav, ogg, opus, webm…)',
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<RecordingResponseDto> {
    const recording = await this.uploadRecording.execute({
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      content: file.buffer,
    });
    return presentRecording(recording);
  }

  /**
   * Faz streaming do áudio (com Range, para o player do navegador). O streaming HTTP é
   * responsabilidade da infraestrutura, por isso usa o helper do @nestjs/storage diretamente
   * em vez de passar o arquivo inteiro pelo port AudioStorage.
   */
  @Get(':id/audio')
  @ApiOperation({
    summary: 'Baixa o áudio original',
    description:
      'Aceita o header Range (resposta 206), usado pelo player do navegador.',
  })
  @RecordingIdParam()
  @ApiProduces('audio/*')
  @ApiOkResponse({
    description: 'Conteúdo do áudio, com o Content-Type original.',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async audio(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const recording = await this.getRecording.execute(id);
    return serveFile(this.disk, recording.storageKey, {
      req,
      res,
      disposition: 'inline',
      filename: recording.originalName,
    });
  }

  @Post(':id/retry')
  @ApiOperation({
    summary: 'Reenfileira a transcrição de uma gravação que falhou',
  })
  @RecordingIdParam()
  @ApiCreatedResponse({ type: RecordingResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Gravação em andamento ou já transcrita',
  })
  async retry(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RecordingResponseDto> {
    return presentRecording(await this.retryRecording.execute(id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a gravação, o áudio e a transcrição' })
  @RecordingIdParam()
  @ApiNoContentResponse({ description: 'Gravação removida' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.deleteRecording.execute(id);
  }
}
