export interface Client {
  id: string
  name: string
  email: string
  document: string | null
  phone: string | null
  createdAt: string
  updatedAt: string
}

export interface ClientInput {
  name: string
  email: string
  document?: string
  phone?: string
}
