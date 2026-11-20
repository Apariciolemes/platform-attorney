import type { QueueOptions } from 'bullmq';

export const TRANSCRIPTION_QUEUE = 'transcription';
export const TRANSCRIBE_JOB = 'transcribe';

export interface TranscribeJobData {
  recordingId: string;
}

export function buildQueueConnection(
  env: NodeJS.ProcessEnv = process.env,
): QueueOptions['connection'] {
  return {
    host: env.REDIS_HOST ?? 'localhost',
    port: Number(env.REDIS_PORT ?? 6379),
    password: env.REDIS_PASSWORD || undefined,
  };
}
