import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  CORRECT_TRANSCRIPT_JOB,
  TRANSCRIBE_JOB,
  TRANSCRIPTION_QUEUE,
  type TranscribeJobData,
} from '../../../config/queue.config.js';
import { TranscriptionQueue } from '../../application/ports/transcription-queue.js';

const JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: true,
  removeOnFail: 100,
} as const;

/** Adapter: implementa o port TranscriptionQueue com BullMQ/Redis. */
@Injectable()
export class BullMqTranscriptionQueue extends TranscriptionQueue {
  constructor(
    @InjectQueue(TRANSCRIPTION_QUEUE)
    private readonly queue: Queue<TranscribeJobData>,
  ) {
    super();
  }

  async enqueue(recordingId: string): Promise<void> {
    await this.queue.add(TRANSCRIBE_JOB, { recordingId }, JOB_OPTIONS);
  }

  async enqueueCorrection(recordingId: string): Promise<void> {
    await this.queue.add(CORRECT_TRANSCRIPT_JOB, { recordingId }, JOB_OPTIONS);
  }
}
