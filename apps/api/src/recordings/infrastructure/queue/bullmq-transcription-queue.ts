import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  TRANSCRIBE_JOB,
  TRANSCRIPTION_QUEUE,
  type TranscribeJobData,
} from '../../../config/queue.config.js';
import { TranscriptionQueue } from '../../application/ports/transcription-queue.js';

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
    await this.queue.add(
      TRANSCRIBE_JOB,
      { recordingId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }
}
