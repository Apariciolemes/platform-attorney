import { ApiProperty } from '@nestjs/swagger';

/** Só para a documentação: o arquivo chega via multipart e é lido pelo FileInterceptor. */
export class UploadRecordingDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Arquivo de áudio (mp3, m4a, wav, ogg, webm…), até 25 MB.',
  })
  file: unknown;
}
