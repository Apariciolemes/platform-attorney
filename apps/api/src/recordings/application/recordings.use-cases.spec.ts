import { Recording, RecordingStatus } from '../domain/recording.js';
import { RecordingNotFoundError } from '../domain/recording.errors.js';
import { AudioStorage } from './ports/audio-storage.js';
import { RecordingRepository } from './ports/recording.repository.js';
import {
  SpeechToText,
  type SpeechToTextInput,
} from './ports/speech-to-text.js';
import { TranscriptionQueue } from './ports/transcription-queue.js';
import { DeleteRecordingUseCase } from './use-cases/delete-recording.use-case.js';
import { GetRecordingUseCase } from './use-cases/get-recording.use-case.js';
import { RecordTranscriptionFailureUseCase } from './use-cases/record-transcription-failure.use-case.js';
import { RetryRecordingUseCase } from './use-cases/retry-recording.use-case.js';
import { TranscribeRecordingUseCase } from './use-cases/transcribe-recording.use-case.js';
import { UploadRecordingUseCase } from './use-cases/upload-recording.use-case.js';

// Adapters em memória: os casos de uso são testados sem banco, S3, Redis ou Nest.

class InMemoryRecordingRepository extends RecordingRepository {
  readonly items = new Map<string, Recording>();
  failNextSave = false;

  findAll() {
    return Promise.resolve([...this.items.values()]);
  }
  findById(id: string) {
    const found = this.items.get(id);
    // Devolve uma cópia, como um banco faria.
    return Promise.resolve(
      found ? Recording.restore(found.toSnapshot()) : null,
    );
  }
  save(recording: Recording) {
    if (this.failNextSave) {
      this.failNextSave = false;
      return Promise.reject(new Error('db down'));
    }
    this.items.set(recording.id, Recording.restore(recording.toSnapshot()));
    return Promise.resolve();
  }
  delete(id: string) {
    this.items.delete(id);
    return Promise.resolve();
  }
}

class InMemoryAudioStorage extends AudioStorage {
  readonly files = new Map<string, Buffer>();

  upload(key: string, content: Buffer) {
    this.files.set(key, content);
    return Promise.resolve();
  }
  download(key: string) {
    const file = this.files.get(key);
    return file
      ? Promise.resolve(file)
      : Promise.reject(new Error('not found'));
  }
  delete(key: string) {
    this.files.delete(key);
    return Promise.resolve();
  }
}

class FakeQueue extends TranscriptionQueue {
  readonly enqueued: string[] = [];

  enqueue(recordingId: string) {
    this.enqueued.push(recordingId);
    return Promise.resolve();
  }
}

class FakeSpeechToText extends SpeechToText {
  readonly calls: SpeechToTextInput[] = [];

  transcribe(input: SpeechToTextInput) {
    this.calls.push(input);
    return Promise.resolve({
      text: 'olá mundo',
      language: 'portuguese',
      durationSeconds: 2.5,
    });
  }
}

describe('casos de uso de gravações', () => {
  let repo: InMemoryRecordingRepository;
  let storage: InMemoryAudioStorage;
  let queue: FakeQueue;

  const upload = () =>
    new UploadRecordingUseCase(repo, storage, queue).execute({
      originalName: 'reuniao.mp3',
      mimeType: 'audio/mpeg',
      sizeBytes: 4,
      content: Buffer.from('fake'),
    });

  beforeEach(() => {
    repo = new InMemoryRecordingRepository();
    storage = new InMemoryAudioStorage();
    queue = new FakeQueue();
  });

  describe('upload', () => {
    it('armazena o áudio, registra como pendente e enfileira a transcrição', async () => {
      const recording = await upload();

      expect(recording.status).toBe(RecordingStatus.Pending);
      expect(storage.files.get(recording.storageKey)?.toString()).toBe('fake');
      expect(repo.items.has(recording.id)).toBe(true);
      expect(queue.enqueued).toEqual([recording.id]);
    });

    it('remove o arquivo do storage se salvar no banco falhar', async () => {
      repo.failNextSave = true;

      await expect(upload()).rejects.toThrow('db down');

      expect(storage.files.size).toBe(0);
      expect(queue.enqueued).toHaveLength(0);
    });
  });

  it('get lança RecordingNotFoundError para id inexistente', async () => {
    await expect(
      new GetRecordingUseCase(repo).execute('missing'),
    ).rejects.toBeInstanceOf(RecordingNotFoundError);
  });

  it('retry reenfileira gravação com falha', async () => {
    const recording = await upload();
    await new RecordTranscriptionFailureUseCase(repo).execute({
      recordingId: recording.id,
      message: 'boom',
      willRetry: false,
    });

    const retried = await new RetryRecordingUseCase(repo, queue).execute(
      recording.id,
    );

    expect(retried.toSnapshot()).toMatchObject({
      status: RecordingStatus.Pending,
      error: null,
    });
    expect(queue.enqueued).toEqual([recording.id, recording.id]);
  });

  it('delete apaga o arquivo e o registro', async () => {
    const recording = await upload();

    await new DeleteRecordingUseCase(repo, storage).execute(recording.id);

    expect(storage.files.size).toBe(0);
    expect(repo.items.size).toBe(0);
  });

  describe('transcribe', () => {
    it('baixa o áudio, transcreve e conclui a gravação', async () => {
      const recording = await upload();
      const stt = new FakeSpeechToText();

      const outcome = await new TranscribeRecordingUseCase(
        repo,
        storage,
        stt,
      ).execute(recording.id);

      expect(outcome).toBe('completed');
      expect(stt.calls[0]).toMatchObject({
        filename: `${recording.id}.mp3`,
        mimeType: 'audio/mpeg',
      });
      expect(repo.items.get(recording.id)?.toSnapshot()).toMatchObject({
        status: RecordingStatus.Completed,
        transcript: 'olá mundo',
        durationSeconds: 2.5,
      });
    });

    it('ignora gravação apagada enquanto esperava na fila', async () => {
      const outcome = await new TranscribeRecordingUseCase(
        repo,
        storage,
        new FakeSpeechToText(),
      ).execute('missing');

      expect(outcome).toBe('recording-missing');
    });
  });
});
