import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { errorMessage } from '@/services/http'
import { recordingsService } from '@/services/recordings.service'
import type { Recording } from '@/types/recording'

const POLL_INTERVAL_MS = 3000

export function useRecordings() {
  const recordings = ref<Recording[]>([])
  const loading = ref(false)
  const uploadProgress = ref<number | null>(null)
  const error = ref<string | null>(null)

  const hasActiveJobs = computed(() =>
    recordings.value.some((r) => r.status === 'pending' || r.status === 'processing'),
  )

  async function fetchRecordings() {
    try {
      recordings.value = await recordingsService.list()
    } catch (e) {
      error.value = errorMessage(e)
    }
  }

  async function load() {
    loading.value = true
    error.value = null
    await fetchRecordings()
    loading.value = false
  }

  async function upload(file: File): Promise<boolean> {
    error.value = null
    uploadProgress.value = 0
    try {
      const created = await recordingsService.upload(file, (p) => (uploadProgress.value = p))
      recordings.value.unshift(created)
      return true
    } catch (e) {
      error.value = errorMessage(e)
      return false
    } finally {
      uploadProgress.value = null
    }
  }

  async function retry(id: string) {
    error.value = null
    try {
      const updated = await recordingsService.retry(id)
      const index = recordings.value.findIndex((r) => r.id === id)
      if (index >= 0) recordings.value[index] = updated
    } catch (e) {
      error.value = errorMessage(e)
    }
  }

  async function remove(id: string) {
    error.value = null
    try {
      await recordingsService.remove(id)
      recordings.value = recordings.value.filter((r) => r.id !== id)
    } catch (e) {
      error.value = errorMessage(e)
    }
  }

  // Enquanto houver transcrição na fila ou em andamento, atualiza a lista periodicamente.
  let timer: ReturnType<typeof setInterval> | undefined
  watch(
    hasActiveJobs,
    (active) => {
      clearInterval(timer)
      timer = active ? setInterval(fetchRecordings, POLL_INTERVAL_MS) : undefined
    },
    { immediate: true },
  )
  onBeforeUnmount(() => clearInterval(timer))

  return {
    recordings,
    loading,
    uploadProgress,
    error,
    load,
    upload,
    retry,
    remove,
    audioUrl: recordingsService.audioUrl,
  }
}
