import axios, { isAxiosError } from 'axios'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
})

/** Extrai a mensagem de erro retornada pelo Nest (string ou lista de validação). */
export function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message
    if (Array.isArray(message)) return message.join(', ')
    if (typeof message === 'string') return message
    return error.message
  }
  return error instanceof Error ? error.message : 'Erro inesperado'
}
