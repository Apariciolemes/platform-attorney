import { S3Disk, type StorageModuleOptions } from '@nestjs/storage';

export const RECORDINGS_DISK = 'recordings';

/**
 * Disco S3 dos áudios. Funciona com qualquer storage compatível com S3:
 * SeaweedFS local (endpoint + forcePathStyle), Cloudflare R2 (region "auto") ou AWS S3.
 */
export function buildStorageOptions(
  env: NodeJS.ProcessEnv = process.env,
): StorageModuleOptions {
  const accessKeyId = env.STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = env.STORAGE_SECRET_ACCESS_KEY;

  return {
    default: RECORDINGS_DISK,
    disks: {
      [RECORDINGS_DISK]: new S3Disk({
        bucket: env.STORAGE_BUCKET ?? 'recordings',
        region: env.STORAGE_REGION ?? 'us-east-1',
        // Vazio = storage local do docker-compose acessado do host (no Docker, o compose injeta http://storage:8333).
        endpoint: env.STORAGE_ENDPOINT || 'http://localhost:8333',
        forcePathStyle: env.STORAGE_FORCE_PATH_STYLE === 'true',
        // Sem chaves explícitas, o S3Disk usa AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY.
        credentials:
          accessKeyId && secretAccessKey
            ? { accessKeyId, secretAccessKey }
            : undefined,
        timeout: '60s',
      }),
    },
  };
}
