import { ConflictException, NotFoundException } from '@nestjs/common';
import { InMemoryDisk } from '@nestjs/storage';
import type { Queue } from 'bullmq';
import type { Repository } from 'typeorm';
import { TRANSCRIBE_JOB } from '../config/queue.config.js';
import { Recording, RecordingStatus } from './entities/recording.entity.js';
import { RecordingsService } from './recordings.service.js';

const audioFile = () => ({
  originalname: 'Reunião.MP3',
  mimetype: 'audio/mpeg',
  size: 4,
  buffer: Buffer.from('fake'),
});

describe('RecordingsService', () => {
  let disk: InMemoryDisk;
  let service: RecordingsService;
  const repo = {
    find: vi.fn(),
    findOneBy: vi.fn(),
    create: vi.fn((data: Partial<Recording>) => data),
    save: vi.fn((entity: Partial<Recording>) => Promise.resolve(entity)),
    remove: vi.fn(),
  };
  const queue = { add: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    disk = new InMemoryDisk();
    service = new RecordingsService(
      repo as unknown as Repository<Recording>,
      disk,
      queue as unknown as Queue,
    );
  });

  it('armazena o áudio, cria o registro pendente e enfileira a transcrição', async () => {
    const recording = await service.upload(audioFile());

    expect(recording.status).toBe(RecordingStatus.Pending);
    expect(recording.storageKey).toBe(`recordings/${recording.id}.mp3`);
    expect(await disk.getText(recording.storageKey)).toBe('fake');
    expect(queue.add).toHaveBeenCalledWith(
      TRANSCRIBE_JOB,
      { recordingId: recording.id },
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it('remove o arquivo do storage se o insert no banco falhar', async () => {
    repo.save.mockRejectedValueOnce(new Error('db down'));

    await expect(service.upload(audioFile())).rejects.toThrow('db down');

    const files = [];
    for await (const entry of disk.listAll()) files.push(entry);
    expect(files).toHaveLength(0);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('lança 404 para gravação inexistente', async () => {
    repo.findOneBy.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('reprocessa gravação com falha', async () => {
    repo.findOneBy.mockResolvedValue({
      id: 'r1',
      status: RecordingStatus.Failed,
      error: 'boom',
    });

    const recording = await service.retry('r1');

    expect(recording).toMatchObject({
      status: RecordingStatus.Pending,
      error: null,
    });
    expect(queue.add).toHaveBeenCalledOnce();
  });

  it('não reprocessa gravação já concluída', async () => {
    repo.findOneBy.mockResolvedValue({
      id: 'r1',
      status: RecordingStatus.Completed,
    });
    await expect(service.retry('r1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('apaga o arquivo e o registro', async () => {
    await disk.put('recordings/r1.mp3', 'x');
    repo.findOneBy.mockResolvedValue({
      id: 'r1',
      storageKey: 'recordings/r1.mp3',
    });

    await service.remove('r1');

    expect(await disk.exists('recordings/r1.mp3')).toBe(false);
    expect(repo.remove).toHaveBeenCalled();
  });
});
