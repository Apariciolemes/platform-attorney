import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TRANSCRIPTION_QUEUE } from '../config/queue.config.js';
import { Recording } from './entities/recording.entity.js';
import { RecordingsController } from './recordings.controller.js';
import { RecordingsService } from './recordings.service.js';

/** Lado HTTP: recebe uploads e só produz jobs (quem consome é o worker). */
@Module({
  imports: [
    TypeOrmModule.forFeature([Recording]),
    BullModule.registerQueue({ name: TRANSCRIPTION_QUEUE }),
  ],
  controllers: [RecordingsController],
  providers: [RecordingsService],
})
export class RecordingsModule {}
