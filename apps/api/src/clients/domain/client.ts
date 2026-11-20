import { randomUUID } from 'node:crypto';

export interface ClientProps {
  id: string;
  name: string;
  email: string;
  document: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientData {
  name: string;
  email: string;
  document?: string | null;
  phone?: string | null;
}

export class Client {
  private constructor(private props: ClientProps) {}

  static create(data: ClientData, now = new Date()): Client {
    return new Client({
      id: randomUUID(),
      name: data.name,
      email: data.email,
      document: data.document ?? null,
      phone: data.phone ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Reconstrói um cliente já persistido (usado pelos adapters de persistência). */
  static restore(props: ClientProps): Client {
    return new Client({ ...props });
  }

  get id() {
    return this.props.id;
  }

  get email() {
    return this.props.email;
  }

  update(changes: Partial<ClientData>, now = new Date()): void {
    this.props = {
      ...this.props,
      ...(changes.name !== undefined && { name: changes.name }),
      ...(changes.email !== undefined && { email: changes.email }),
      ...(changes.document !== undefined && { document: changes.document }),
      ...(changes.phone !== undefined && { phone: changes.phone }),
      updatedAt: now,
    };
  }

  toSnapshot(): Readonly<ClientProps> {
    return { ...this.props };
  }
}
