import type { Recording } from '../../domain/recording.js';

/** Port de persistência de gravações. A classe abstrata também serve de token de injeção. */
export abstract class RecordingRepository {
  abstract findAll(): Promise<Recording[]>;
  abstract findById(id: string): Promise<Recording | null>;
  abstract save(recording: Recording): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
