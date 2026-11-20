/** Port da fila que agenda o processamento em segundo plano (transcrição e revisão do texto). */
export abstract class TranscriptionQueue {
  abstract enqueue(recordingId: string): Promise<void>;
  abstract enqueueCorrection(recordingId: string): Promise<void>;
}
