import type { TranscriptionCosts } from '@/types/costs'
import { http } from './http'

export const costsService = {
  async get(): Promise<TranscriptionCosts> {
    const { data } = await http.get<TranscriptionCosts>('/costs')
    return data
  },
}
