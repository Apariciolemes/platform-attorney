import { ref } from 'vue'
import { errorMessage } from '@/services/http'
import { clientsService } from '@/services/clients.service'
import type { Client, ClientInput } from '@/types/client'

export function useClients() {
  const clients = ref<Client[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function run<T>(action: () => Promise<T>): Promise<T | undefined> {
    loading.value = true
    error.value = null
    try {
      return await action()
    } catch (e) {
      error.value = errorMessage(e)
      return undefined
    } finally {
      loading.value = false
    }
  }

  async function fetchClients() {
    const data = await run(() => clientsService.list())
    if (data) clients.value = data
  }

  async function saveClient(input: ClientInput, id?: string): Promise<boolean> {
    const saved = await run(() =>
      id ? clientsService.update(id, input) : clientsService.create(input),
    )
    if (!saved) return false
    const index = clients.value.findIndex((c) => c.id === saved.id)
    if (index >= 0) clients.value[index] = saved
    else clients.value.unshift(saved)
    return true
  }

  async function removeClient(id: string) {
    const ok = await run(async () => {
      await clientsService.remove(id)
      return true
    })
    if (ok) clients.value = clients.value.filter((c) => c.id !== id)
  }

  return { clients, loading, error, fetchClients, saveClient, removeClient }
}
