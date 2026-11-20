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
import { RecordingsService } from './recordings.service.js';

/** Limite de arquivo do plano gratuito da Groq. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

@Controller('recordings')
export class RecordingsController {
  constructor(
    private readonly recordingsService: RecordingsService,
    private readonly disk: StorageDisk,
  ) {}

  @Get()
  findAll() {
    return this.recordingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.recordingsService.findOne(id);
  }

  /** multipart/form-data com o campo "file". Responde 413 acima de 25 MB. */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  upload(
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
    return this.recordingsService.upload(file);
  }

  /** Faz streaming do áudio a partir do storage (suporta Range, para o player do navegador). */
  @Get(':id/audio')
  async audio(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const recording = await this.recordingsService.findOne(id);
    return serveFile(this.disk, recording.storageKey, {
      req,
      res,
      disposition: 'inline',
      filename: recording.originalName,
    });
  }

  @Post(':id/retry')
  retry(@Param('id', ParseUUIDPipe) id: string) {
    return this.recordingsService.retry(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.recordingsService.remove(id);
  }
}
