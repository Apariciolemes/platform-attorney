import type { Recording } from '../../domain/recording.js';
import type { RecordingResponseDto } from './dto/recording-response.dto.js';

/** Formato JSON exposto pela API; o tipo garante que bate com o documentado no Swagger. */
export function presentRecording(recording: Recording): RecordingResponseDto {
  return recording.toSnapshot();
}
