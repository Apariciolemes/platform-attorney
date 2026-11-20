/** Port do armazenamento dos arquivos de áudio (S3, R2, disco local…). */
export abstract class AudioStorage {
  abstract upload(
    key: string,
    content: Buffer,
    contentType: string,
  ): Promise<void>;
  abstract download(key: string): Promise<Buffer>;
  /** Apagar uma chave inexistente não é erro. */
  abstract delete(key: string): Promise<void>;
}
