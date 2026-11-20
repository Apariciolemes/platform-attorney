/** Port da fila que agenda a transcrição em segundo plano. */
export abstract class TranscriptionQueue {
  abstract enqueue(recordingId: string): Promise<void>;
}
