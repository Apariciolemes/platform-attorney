import { Recording, RecordingStatus } from './recording.js';
import { RecordingNotRetryableError } from './recording.errors.js';

const newRecording = () =>
  Recording.create({
    originalName: 'Reunião.MP3',
    mimeType: 'audio/mpeg',
    sizeBytes: 4,
  });

describe('Recording', () => {
  it('nasce pendente, com chave de storage derivada do id e da extensão', () => {
    const recording = newRecording();

    expect(recording.status).toBe(RecordingStatus.Pending);
    expect(recording.storageKey).toBe(`recordings/${recording.id}.mp3`);
  });

  it('percorre pending → processing → completed guardando a transcrição', () => {
    const recording = newRecording();

    recording.startProcessing();
    expect(recording.status).toBe(RecordingStatus.Processing);

    recording.complete({
      text: 'olá',
      language: 'portuguese',
      durationSeconds: 2,
    });
    expect(recording.toSnapshot()).toMatchObject({
      status: RecordingStatus.Completed,
      transcript: 'olá',
      language: 'portuguese',
      durationSeconds: 2,
      error: null,
    });
  });

  it('volta para pending se ainda haverá nova tentativa, senão falha', () => {
    const recording = newRecording();

    recording.registerFailure('timeout', true);
    expect(recording.status).toBe(RecordingStatus.Pending);

    recording.registerFailure('timeout', false);
    expect(recording.toSnapshot()).toMatchObject({
      status: RecordingStatus.Failed,
      error: 'timeout',
    });
  });

  it('aceita reprocessar gravação com falha e limpa o erro', () => {
    const recording = newRecording();
    recording.registerFailure('boom', false);

    recording.requestRetry();

    expect(recording.toSnapshot()).toMatchObject({
      status: RecordingStatus.Pending,
      error: null,
    });
  });

  it.each([RecordingStatus.Processing, RecordingStatus.Completed])(
    'recusa reprocessar gravação %s',
    (status) => {
      const recording = Recording.restore({
        ...newRecording().toSnapshot(),
        status,
      });
      expect(() => recording.requestRetry()).toThrow(
        RecordingNotRetryableError,
      );
    },
  );
});
