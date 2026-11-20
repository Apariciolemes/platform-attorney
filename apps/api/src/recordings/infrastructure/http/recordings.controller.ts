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
import type { Request, Response } from 'express';
import { DeleteRecordingUseCase } from '../../application/use-cases/delete-recording.use-case.js';
import { GetRecordingUseCase } from '../../application/use-cases/get-recording.use-case.js';
import { ListRecordingsUseCase } from '../../application/use-cases/list-recordings.use-case.js';
import { RetryRecordingUseCase } from '../../application/use-cases/retry-recording.use-case.js';
import { UploadRecordingUseCase } from '../../application/use-cases/upload-recording.use-case.js';
import { presentRecording } from './recording.presenter.js';

/** Limite de arquivo da API de transcrição (OpenAI e Groq aceitam até 25 MB). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Adapter de entrada HTTP: valida a requisição, chama o caso de uso e formata a resposta. */
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
  async findAll() {
    const recordings = await this.listRecordings.execute();
    return recordings.map(presentRecording);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return presentRecording(await this.getRecording.execute(id));
  }

  /** multipart/form-data com o campo "file". Responde 413 acima de 25 MB. */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({
            fileType: /^audio\//,
            // Alguns formatos (ex.: webm de gravações do navegador) são detectados como vídeo.
            fallbackToMimetype: true,
            errorMessage:
              'Envie um arquivo de áudio (mp3, m4a, wav, ogg, webm…)',
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
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
  async retry(@Param('id', ParseUUIDPipe) id: string) {
    return presentRecording(await this.retryRecording.execute(id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.deleteRecording.execute(id);
  }
}
