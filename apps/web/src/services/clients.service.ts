import type { Client, ClientInput } from '@/types/client'
import { http } from './http'

export const clientsService = {
  async list(): Promise<Client[]> {
    const { data } = await http.get<Client[]>('/clients')
    return data
  },
  async create(input: ClientInput): Promise<Client> {
    const { data } = await http.post<Client>('/clients', input)
    return data
  },
  async update(id: string, input: Partial<ClientInput>): Promise<Client> {
    const { data } = await http.patch<Client>(`/clients/${id}`, input)
    return data
  },
  async remove(id: string): Promise<void> {
    await http.delete(`/clients/${id}`)
  },
}
