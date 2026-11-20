import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClients1763650000000 implements MigrationInterface {
  name = 'CreateClients1763650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "clients" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(150) NOT NULL,
        "email" character varying(150) NOT NULL,
        "document" character varying(20),
        "phone" character varying(20),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_clients_email" UNIQUE ("email"),
        CONSTRAINT "PK_clients_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "clients"`);
  }
}
