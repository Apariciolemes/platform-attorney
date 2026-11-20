import { basename } from 'node:path';
import type { AudioStorage } from '../ports/audio-storage.js';
import type { RecordingRepository } from '../ports/recording.repository.js';
import type { SpeechToText } from '../ports/speech-to-text.js';
import type { TranscriptionQueue } from '../ports/transcription-queue.js';

export type TranscribeOutcome = 'completed' | 'recording-missing';

export interface TranscribeRecordingOptions {
  /** Se a transcrição deve ser revisada por IA depois de pronta. */
  correctionEnabled: boolean;
}

/** Executado pelo worker: baixa o áudio, transcreve, grava o resultado e agenda a revisão do texto. */
export class TranscribeRecordingUseCase {
  constructor(
    private readonly recordings: RecordingRepository,
    private readonly storage: AudioStorage,
    private readonly speechToText: SpeechToText,
    private readonly queue: TranscriptionQueue,
    private readonly options: TranscribeRecordingOptions,
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

    recording.complete(transcript, this.options.correctionEnabled);
    await this.recordings.save(recording);
    if (this.options.correctionEnabled) {
      await this.queue.enqueueCorrection(recording.id);
    }
    return 'completed';
  }
}
