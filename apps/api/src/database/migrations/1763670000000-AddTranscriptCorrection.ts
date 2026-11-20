import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTranscriptCorrection1763670000000 implements MigrationInterface {
  name = 'AddTranscriptCorrection1763670000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "recordings_correction_status_enum" AS ENUM ('pending', 'processing', 'completed', 'failed')`,
    );
    await queryRunner.query(`
      ALTER TABLE "recordings"
        ADD "correction_status" "recordings_correction_status_enum",
        ADD "corrected_transcript" text,
        ADD "correction_error" text,
        ADD "correction_model" character varying(100),
        ADD "correction_input_tokens" integer,
        ADD "correction_output_tokens" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "recordings"
        DROP COLUMN "correction_output_tokens",
        DROP COLUMN "correction_input_tokens",
        DROP COLUMN "correction_model",
        DROP COLUMN "correction_error",
        DROP COLUMN "corrected_transcript",
        DROP COLUMN "correction_status"
    `);
    await queryRunner.query(`DROP TYPE "recordings_correction_status_enum"`);
  }
}
