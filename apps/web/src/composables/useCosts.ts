import { computed, ref, watch } from 'vue'
import { costsService } from '@/services/costs.service'
import { errorMessage } from '@/services/http'
import type { TranscriptionCosts } from '@/types/costs'

const EXCHANGE_RATE_KEY = 'platform-attorney:usd-brl'

/** Lê/grava a cotação informada pela pessoa; o navegador pode bloquear o armazenamento. */
function readStoredRate(): number | null {
  try {
    const value = Number(localStorage.getItem(EXCHANGE_RATE_KEY))
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

function storeRate(value: number | null) {
  try {
    if (value) localStorage.setItem(EXCHANGE_RATE_KEY, String(value))
    else localStorage.removeItem(EXCHANGE_RATE_KEY)
  } catch {
    // Sem armazenamento: a cotação vale só nesta visita.
  }
}

export function useCosts() {
  const costs = ref<TranscriptionCosts | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** Cotação US$ → R$ informada pela pessoa (opcional; não buscamos câmbio na internet). */
  const usdToBrl = ref<number | null>(readStoredRate())
  watch(usdToBrl, (value) => storeRate(value && value > 0 ? value : null))

  const usdPerMinute = computed(() => costs.value?.pricing.usdPerMinute ?? null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      costs.value = await costsService.get()
    } catch (e) {
      error.value = errorMessage(e)
    } finally {
      loading.value = false
    }
  }

  /** Custo estimado de N minutos de áudio ao preço atual. */
  function costForMinutes(minutes: number): number | null {
    return usdPerMinute.value == null ? null : minutes * usdPerMinute.value
  }

  return { costs, loading, error, usdToBrl, usdPerMinute, load, costForMinutes }
}
