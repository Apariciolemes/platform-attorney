import type { Recording } from '@/types/recording'
import { http } from './http'

export const recordingsService = {
  async list(): Promise<Recording[]> {
    const { data } = await http.get<Recording[]>('/recordings')
    return data
  },
  async get(id: string): Promise<Recording> {
    const { data } = await http.get<Recording>(`/recordings/${id}`)
    return data
  },
  async upload(file: File, onProgress?: (percent: number) => void): Promise<Recording> {
    const form = new FormData()
    form.append('file', file)
    const { data } = await http.post<Recording>('/recordings', form, {
      onUploadProgress: (event) => {
        if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100))
      },
    })
    return data
  },
  async retry(id: string): Promise<Recording> {
    const { data } = await http.post<Recording>(`/recordings/${id}/retry`)
    return data
  },
  /** Pede (de novo) a revisão do texto por IA. */
  async requestCorrection(id: string): Promise<Recording> {
    const { data } = await http.post<Recording>(`/recordings/${id}/correction`)
    return data
  },
  async remove(id: string): Promise<void> {
    await http.delete(`/recordings/${id}`)
  },
  audioUrl(id: string): string {
    return `${http.defaults.baseURL ?? ''}/recordings/${id}/audio`
  },
}
