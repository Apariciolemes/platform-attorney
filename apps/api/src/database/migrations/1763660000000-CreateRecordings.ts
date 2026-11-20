import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRecordings1763660000000 implements MigrationInterface {
  name = 'CreateRecordings1763660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "recordings_status_enum" AS ENUM ('pending', 'processing', 'completed', 'failed')`,
    );
    await queryRunner.query(`
      CREATE TABLE "recordings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "original_name" character varying(255) NOT NULL,
        "mime_type" character varying(100) NOT NULL,
        "size_bytes" integer NOT NULL,
        "storage_key" character varying(255) NOT NULL,
        "status" "recordings_status_enum" NOT NULL DEFAULT 'pending',
        "transcript" text,
        "language" character varying(50),
        "duration_seconds" double precision,
        "error" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_recordings_storage_key" UNIQUE ("storage_key"),
        CONSTRAINT "PK_recordings_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "recordings"`);
    await queryRunner.query(`DROP TYPE "recordings_status_enum"`);
  }
}
