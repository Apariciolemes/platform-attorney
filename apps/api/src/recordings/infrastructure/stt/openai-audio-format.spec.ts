import { NonRetryableTranscriptionError } from '../../application/ports/speech-to-text.js';
import { AUDIO_MEDIA_TYPE } from '../http/recordings.controller.js';
import { openAiUploadFile } from './openai-audio-format.js';

describe('openAiUploadFile', () => {
  it.each([
    // [descrição, nome no storage, tipo gravado, nome enviado, tipo enviado]
    [
      'WhatsApp Web (.mp4 com áudio M4A)',
      'r1.mp4',
      'video/mp4',
      'r1.m4a',
      'audio/mp4',
    ],
    [
      'M4A detectado pelo conteúdo',
      'r1.mp4',
      'audio/x-m4a',
      'r1.m4a',
      'audio/mp4',
    ],
    [
      'nota de voz do WhatsApp (.opus)',
      'r1.opus',
      'audio/ogg; codecs=opus',
      'r1.ogg',
      'audio/ogg',
    ],
    [
      'gravador do navegador (webm)',
      'r1.webm',
      'video/webm',
      'r1.webm',
      'audio/webm',
    ],
    ['MP3', 'r1.mp3', 'audio/mpeg', 'r1.mp3', 'audio/mpeg'],
    ['WAV', 'r1.wav', 'audio/x-wav', 'r1.wav', 'audio/wav'],
    [
      'tipo desconhecido com extensão aceita',
      'r1.mpga',
      'application/octet-stream',
      'r1.mpga',
      'application/octet-stream',
    ],
  ])('%s', (_label, filename, mimeType, expectedName, expectedType) => {
    expect(openAiUploadFile(filename, mimeType)).toEqual({
      filename: expectedName,
      contentType: expectedType,
    });
  });

  it('recusa sem retry um formato que a API não aceita (AAC puro)', () => {
    expect(() => openAiUploadFile('r1.aac', 'audio/aac')).toThrow(
      NonRetryableTranscriptionError,
    );
  });
});

describe('AUDIO_MEDIA_TYPE (validação do upload)', () => {
  it.each([
    'audio/x-m4a',
    'audio/ogg; codecs=opus',
    'audio/mpeg',
    'video/mp4',
    'video/webm',
  ])('aceita %s', (type) => {
    expect(AUDIO_MEDIA_TYPE.test(type)).toBe(true);
  });

  it.each(['video/quicktime', 'image/png', 'application/pdf'])(
    'recusa %s',
    (type) => {
      expect(AUDIO_MEDIA_TYPE.test(type)).toBe(false);
    },
  );
});
