import { Injectable } from '@nestjs/common';
import { StorageDisk } from '@nestjs/storage';
import { AudioStorage } from '../../application/ports/audio-storage.js';

/** Adapter: implementa o port AudioStorage com o disco S3 do @nestjs/storage (SeaweedFS, R2, AWS). */
@Injectable()
export class S3AudioStorage extends AudioStorage {
  constructor(private readonly disk: StorageDisk) {
    super();
  }

  async upload(key: string, content: Buffer, contentType: string) {
    await this.disk.put(key, content, {
      contentType,
      contentLength: content.length,
    });
  }

  download(key: string): Promise<Buffer> {
    return this.disk.getBuffer(key);
  }

  delete(key: string): Promise<void> {
    return this.disk.delete(key);
  }
}
