import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { errorMessage } from '@/services/http'
import { recordingsService } from '@/services/recordings.service'
import type { Recording } from '@/types/recording'
import { recordingStage } from '@/utils/recording-stage'

const POLL_INTERVAL_MS = 3000

/** Uma gravação, atualizada sozinha enquanto a transcrição ou a revisão estiverem em andamento. */
export function useRecording(id: () => string) {
  const recording = ref<Recording | null>(null)
  const loading = ref(false)
  const notFound = ref(false)
  const error = ref<string | null>(null)
  const busy = ref(false)

  const stage = computed(() => (recording.value ? recordingStage(recording.value) : null))

  async function fetchRecording() {
    try {
      recording.value = await recordingsService.get(id())
      notFound.value = false
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status
      if (status === 404) notFound.value = true
      else error.value = errorMessage(e)
    }
  }

  async function load() {
    loading.value = true
    error.value = null
    await fetchRecording()
    loading.value = false
  }

  /** Executa uma ação que devolve a gravação atualizada. */
  async function act(action: () => Promise<Recording>) {
    busy.value = true
    error.value = null
    try {
      recording.value = await action()
    } catch (e) {
      error.value = errorMessage(e)
    } finally {
      busy.value = false
    }
  }

  const retry = () => act(() => recordingsService.retry(id()))
  const requestCorrection = () => act(() => recordingsService.requestCorrection(id()))

  async function remove(): Promise<boolean> {
    busy.value = true
    error.value = null
    try {
      await recordingsService.remove(id())
      return true
    } catch (e) {
      error.value = errorMessage(e)
      return false
    } finally {
      busy.value = false
    }
  }

  let timer: ReturnType<typeof setInterval> | undefined
  watch(
    () => stage.value?.active ?? false,
    (active) => {
      clearInterval(timer)
      timer = active ? setInterval(fetchRecording, POLL_INTERVAL_MS) : undefined
    },
    { immediate: true },
  )
  onBeforeUnmount(() => clearInterval(timer))

  return {
    recording,
    stage,
    loading,
    notFound,
    error,
    busy,
    load,
    retry,
    requestCorrection,
    remove,
    audioUrl: () => recordingsService.audioUrl(id()),
  }
}
