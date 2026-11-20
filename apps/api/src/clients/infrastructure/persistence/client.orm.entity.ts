import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Modelo de tabela do TypeORM. O domínio usa `Client`; a conversão fica no ClientMapper. */
@Entity('clients')
export class ClientOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 150, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  document: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
