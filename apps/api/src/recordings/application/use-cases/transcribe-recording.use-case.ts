import { basename } from 'node:path';
import type { AudioStorage } from '../ports/audio-storage.js';
import type { RecordingRepository } from '../ports/recording.repository.js';
import type { SpeechToText } from '../ports/speech-to-text.js';

export type TranscribeOutcome = 'completed' | 'recording-missing';

/** Executado pelo worker: baixa o áudio, transcreve e grava o resultado. */
export class TranscribeRecordingUseCase {
  constructor(
    private readonly recordings: RecordingRepository,
    private readonly storage: AudioStorage,
    private readonly speechToText: SpeechToText,
  ) {}

  async execute(recordingId: string): Promise<TranscribeOutcome> {
    const recording = await this.recordings.findById(recordingId);
    // Gravação apagada enquanto esperava na fila: nada a fazer.
    if (!recording) return 'recording-missing';

    recording.startProcessing();
    await this.recordings.save(recording);

    const audio = await this.storage.download(recording.storageKey);
    const transcript = await this.speechToText.transcribe({
      audio,
      filename: basename(recording.storageKey),
      mimeType: recording.mimeType,
    });

    recording.complete(transcript);
    await this.recordings.save(recording);
    return 'completed';
  }
}
