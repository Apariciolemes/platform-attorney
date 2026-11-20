<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useClients } from '@/composables/useClients'
import type { Client, ClientInput } from '@/types/client'

const { clients, loading, error, fetchClients, saveClient, removeClient } = useClients()

const emptyForm = (): ClientInput => ({ name: '', email: '', document: '', phone: '' })
const form = reactive<ClientInput>(emptyForm())
const editingId = ref<string | null>(null)

const formTitle = computed(() => (editingId.value ? 'Editar cliente' : 'Novo cliente'))
const submitLabel = computed(() => (editingId.value ? 'Salvar alterações' : 'Cadastrar cliente'))

/*
 * Tabela no desktop; no celular (< sm) cada linha vira um bloco empilhado,
 * com o rótulo da coluna vindo de data-label.
 */
const th = 'px-4 py-3 text-left text-sm font-semibold whitespace-nowrap text-muted'
const tdBase = 'border-b border-line px-4 py-3 align-middle max-sm:border-0 max-sm:p-0'
const td = `${tdBase} max-sm:block`
const labeledTd = `${tdBase} max-sm:grid max-sm:grid-cols-[7.5rem_1fr] max-sm:gap-3 max-sm:wrap-anywhere max-sm:before:text-sm max-sm:before:font-semibold max-sm:before:text-muted max-sm:before:content-[attr(data-label)]`

function resetForm() {
  Object.assign(form, emptyForm())
  editingId.value = null
}

function edit(client: Client) {
  editingId.value = client.id
  Object.assign(form, {
    name: client.name,
    email: client.email,
    document: client.document ?? '',
    phone: client.phone ?? '',
  })
}

async function submit() {
  const payload: ClientInput = {
    name: form.name.trim(),
    email: form.email.trim(),
    document: form.document?.trim() || undefined,
    phone: form.phone?.trim() || undefined,
  }
  if (await saveClient(payload, editingId.value ?? undefined)) resetForm()
}

async function confirmRemove(client: Client) {
  if (confirm(`Remover ${client.name} da lista de clientes?`)) await removeClient(client.id)
}

onMounted(fetchClients)
</script>

<template>
  <div class="grid gap-8">
    <header class="grid gap-2">
      <h1 class="text-2xl">Clientes</h1>
      <p class="max-w-[60ch] text-muted">
        Guarde os dados de contato de cada cliente em um só lugar.
      </p>
    </header>

    <section class="grid gap-4" aria-labelledby="client-form-title">
      <h2 id="client-form-title" class="text-lg">{{ formTitle }}</h2>
      <form class="panel grid gap-x-6 gap-y-4 sm:grid-cols-2" @submit.prevent="submit">
        <div class="grid gap-1">
          <label class="field-label" for="client-name">Nome</label>
          <input
            id="client-name"
            v-model="form.name"
            class="input"
            required
            maxlength="150"
            autocomplete="name"
          />
        </div>
        <div class="grid gap-1">
          <label class="field-label" for="client-email">E-mail</label>
          <input
            id="client-email"
            v-model="form.email"
            class="input"
            type="email"
            required
            maxlength="150"
            autocomplete="email"
          />
        </div>
        <div class="grid gap-1">
          <label class="field-label" for="client-document">
            CPF ou CNPJ <span class="font-normal text-muted">(opcional)</span>
          </label>
          <input
            id="client-document"
            v-model="form.document"
            class="input tabular-nums"
            maxlength="20"
            inputmode="numeric"
          />
        </div>
        <div class="grid gap-1">
          <label class="field-label" for="client-phone">
            Telefone <span class="font-normal text-muted">(opcional)</span>
          </label>
          <input
            id="client-phone"
            v-model="form.phone"
            class="input tabular-nums"
            type="tel"
            maxlength="20"
            autocomplete="tel"
          />
        </div>
        <div class="col-span-full flex flex-wrap gap-3 pt-2">
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ submitLabel }}
          </button>
          <button v-if="editingId" type="button" class="btn" @click="resetForm">Cancelar</button>
        </div>
        <p v-if="error" class="col-span-full text-danger" role="alert">{{ error }}</p>
      </form>
    </section>

    <section class="grid gap-4" aria-labelledby="client-list-title">
      <div class="flex flex-wrap items-baseline justify-between gap-4">
        <h2 id="client-list-title" class="text-lg">Cadastrados</h2>
        <span v-if="clients.length" class="text-muted tabular-nums">
          {{ clients.length }} {{ clients.length === 1 ? 'cliente' : 'clientes' }}
        </span>
      </div>

      <p v-if="loading && !clients.length" class="text-muted">Carregando clientes…</p>
      <p v-else-if="!clients.length" class="text-muted">
        Nenhum cliente cadastrado ainda. Use o formulário acima para adicionar o primeiro.
      </p>
      <div v-else class="panel overflow-x-auto p-0! max-sm:overflow-visible">
        <table class="w-full border-collapse max-sm:block">
          <thead class="max-sm:sr-only">
            <tr class="border-b border-line">
              <th scope="col" :class="th">Nome</th>
              <th scope="col" :class="th">E-mail</th>
              <th scope="col" :class="th">CPF ou CNPJ</th>
              <th scope="col" :class="th">Telefone</th>
              <th scope="col" :class="th"><span class="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody class="max-sm:block">
            <tr
              v-for="client in clients"
              :key="client.id"
              class="[&:last-child>td]:border-b-0 max-sm:grid max-sm:gap-2 max-sm:border-b max-sm:border-line max-sm:p-4 max-sm:last:border-b-0"
            >
              <td :class="td" class="font-semibold">{{ client.name }}</td>
              <td :class="labeledTd" data-label="E-mail">{{ client.email }}</td>
              <td :class="labeledTd" class="tabular-nums" data-label="CPF ou CNPJ">
                <span v-if="client.document">{{ client.document }}</span>
                <span v-else class="text-muted">Não informado</span>
              </td>
              <td :class="labeledTd" class="tabular-nums" data-label="Telefone">
                <span v-if="client.phone">{{ client.phone }}</span>
                <span v-else class="text-muted">Não informado</span>
              </td>
              <td :class="td" class="text-right whitespace-nowrap max-sm:-ml-3 max-sm:text-left">
                <button type="button" class="btn btn-quiet" @click="edit(client)">
                  Editar<span class="sr-only"> {{ client.name }}</span>
                </button>
                <button
                  type="button"
                  class="btn btn-quiet btn-danger"
                  @click="confirmRemove(client)"
                >
                  Remover<span class="sr-only"> {{ client.name }}</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
