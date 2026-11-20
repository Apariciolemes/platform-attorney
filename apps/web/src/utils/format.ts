/** Valores pequenos (frações de centavo) ganham mais casas para não virarem "US$ 0,00". */
function money(value: number, currency: 'USD' | 'BRL'): string {
  // Abaixo de 4 casas o valor viraria "0,00"; mostra o limite em vez de sugerir custo zero.
  if (value > 0 && value < 0.0001) return `< ${money(0.0001, currency)}`
  const small = Math.abs(value) > 0 && Math.abs(value) < 1
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: small ? 4 : 2,
  }).format(value)
}

export const formatUsd = (value: number) => money(value, 'USD')
export const formatBrl = (value: number) => money(value, 'BRL')

/** 272.2 → "4:32"; 3725 → "1:02:05" */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/** 554.5 s → "9,2 minutos" */
export function formatMinutes(seconds: number): string {
  const minutes = seconds / 60
  const text = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(minutes)
  return `${text} ${minutes === 1 ? 'minuto' : 'minutos'}`
}

/** "2027-02-26" → "26 de fev. de 2027" (sem deslocamento de fuso). */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(y, m - 1, d))
}

export const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
