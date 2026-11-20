import { extname, parse } from 'node:path';
import { NonRetryableTranscriptionError } from '../../application/ports/speech-to-text.js';

/**
 * A API de transcrição da OpenAI deduz o formato pela extensão do arquivo e aceita só:
 * flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm.
 * Arquivos reais nem sempre chegam com nome/tipo nesse padrão; ex.: o WhatsApp Web baixa
 * áudios como ".mp4"/"video/mp4" (contêiner M4A), que a API recusa se enviados assim,
 * e notas de voz como ".opus" (Ogg/Opus), extensão que a API não reconhece.
 */
const FORMAT_BY_MEDIA_TYPE: Record<
  string,
  { extension: string; contentType: string }
> = {
  'audio/mpeg': { extension: 'mp3', contentType: 'audio/mpeg' },
  'audio/mp3': { extension: 'mp3', contentType: 'audio/mpeg' },
  'audio/mp4': { extension: 'm4a', contentType: 'audio/mp4' },
  'audio/x-m4a': { extension: 'm4a', contentType: 'audio/mp4' },
  'audio/m4a': { extension: 'm4a', contentType: 'audio/mp4' },
  'video/mp4': { extension: 'm4a', contentType: 'audio/mp4' },
  'audio/ogg': { extension: 'ogg', contentType: 'audio/ogg' },
  'audio/opus': { extension: 'ogg', contentType: 'audio/ogg' },
  'audio/wav': { extension: 'wav', contentType: 'audio/wav' },
  'audio/x-wav': { extension: 'wav', contentType: 'audio/wav' },
  'audio/wave': { extension: 'wav', contentType: 'audio/wav' },
  'audio/vnd.wave': { extension: 'wav', contentType: 'audio/wav' },
  'audio/webm': { extension: 'webm', contentType: 'audio/webm' },
  'video/webm': { extension: 'webm', contentType: 'audio/webm' },
  'audio/flac': { extension: 'flac', contentType: 'audio/flac' },
  'audio/x-flac': { extension: 'flac', contentType: 'audio/flac' },
};

const SUPPORTED_EXTENSIONS = new Set([
  'flac',
  'm4a',
  'mp3',
  'mp4',
  'mpeg',
  'mpga',
  'oga',
  'ogg',
  'wav',
  'webm',
]);

export interface OpenAiUploadFile {
  filename: string;
  contentType: string;
}

/**
 * Nome e tipo com que o áudio deve ser enviado à OpenAI, a partir do tipo detectado no upload.
 * Lança NonRetryableTranscriptionError para formatos que a API não aceita (ex.: AAC puro).
 */
export function openAiUploadFile(
  filename: string,
  mimeType: string,
): OpenAiUploadFile {
  const baseName = parse(filename).name;
  // "audio/ogg; codecs=opus" → "audio/ogg"
  const mediaType = mimeType.split(';')[0].trim().toLowerCase();
  const known = FORMAT_BY_MEDIA_TYPE[mediaType];
  if (known) {
    return {
      filename: `${baseName}.${known.extension}`,
      contentType: known.contentType,
    };
  }

  const extension = extname(filename).slice(1).toLowerCase();
  if (SUPPORTED_EXTENSIONS.has(extension)) {
    return { filename, contentType: mimeType };
  }

  throw new NonRetryableTranscriptionError(
    `Formato de áudio não suportado pelo serviço de transcrição (${mimeType}). ` +
      'Envie MP3, M4A, WAV, OGG, OPUS, WEBM ou FLAC.',
  );
}
