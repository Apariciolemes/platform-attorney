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
  <div class="page">
    <header class="page-header">
      <h1>Clientes</h1>
      <p>Guarde os dados de contato de cada cliente em um só lugar.</p>
    </header>

    <section class="section" aria-labelledby="client-form-title">
      <h2 id="client-form-title">{{ formTitle }}</h2>
      <form class="panel client-form" @submit.prevent="submit">
        <div class="field">
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
        <div class="field">
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
        <div class="field">
          <label class="field-label" for="client-document">
            CPF ou CNPJ <span class="field-optional">(opcional)</span>
          </label>
          <input
            id="client-document"
            v-model="form.document"
            class="input numeric"
            maxlength="20"
            inputmode="numeric"
          />
        </div>
        <div class="field">
          <label class="field-label" for="client-phone">
            Telefone <span class="field-optional">(opcional)</span>
          </label>
          <input
            id="client-phone"
            v-model="form.phone"
            class="input numeric"
            type="tel"
            maxlength="20"
            autocomplete="tel"
          />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ submitLabel }}
          </button>
          <button v-if="editingId" type="button" class="btn" @click="resetForm">Cancelar</button>
        </div>
        <p v-if="error" class="error form-error" role="alert">{{ error }}</p>
      </form>
    </section>

    <section class="section" aria-labelledby="client-list-title">
      <div class="section-header">
        <h2 id="client-list-title">Cadastrados</h2>
        <span v-if="clients.length" class="muted numeric">
          {{ clients.length }} {{ clients.length === 1 ? 'cliente' : 'clientes' }}
        </span>
      </div>

      <p v-if="loading && !clients.length" class="muted">Carregando clientes…</p>
      <p v-else-if="!clients.length" class="muted">
        Nenhum cliente cadastrado ainda. Use o formulário acima para adicionar o primeiro.
      </p>
      <div v-else class="panel table-panel">
        <table>
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">E-mail</th>
              <th scope="col">CPF ou CNPJ</th>
              <th scope="col">Telefone</th>
              <th scope="col"><span class="visually-hidden">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="client in clients" :key="client.id">
              <td class="cell-name">{{ client.name }}</td>
              <td data-label="E-mail">{{ client.email }}</td>
              <td class="numeric" data-label="CPF ou CNPJ">
                <span v-if="client.document">{{ client.document }}</span>
                <span v-else class="muted">Não informado</span>
              </td>
              <td class="numeric" data-label="Telefone">
                <span v-if="client.phone">{{ client.phone }}</span>
                <span v-else class="muted">Não informado</span>
              </td>
              <td class="cell-actions">
                <button type="button" class="btn btn-quiet" @click="edit(client)">
                  Editar<span class="visually-hidden"> {{ client.name }}</span>
                </button>
                <button
                  type="button"
                  class="btn btn-quiet btn-danger"
                  @click="confirmRemove(client)"
                >
                  Remover<span class="visually-hidden"> {{ client.name }}</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.client-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4) var(--space-6);
}

.form-actions {
  grid-column: 1 / -1;
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding-top: var(--space-2);
}

.form-error {
  grid-column: 1 / -1;
}

@media (max-width: 40rem) {
  .client-form {
    grid-template-columns: 1fr;
  }
}

/* A tabela rola dentro do painel no celular, sem estourar a página. */
.table-panel {
  padding: 0;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: var(--space-3) var(--space-4);
  text-align: left;
  vertical-align: middle;
  border-bottom: 1px solid var(--color-line);
}

tbody tr:last-child td {
  border-bottom: none;
}

th {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-muted);
  white-space: nowrap;
}

.cell-name {
  font-weight: 600;
}

.cell-actions {
  white-space: nowrap;
  text-align: right;
}

/* No celular, cada cliente vira um bloco empilhado com rótulos, em vez de rolagem lateral. */
@media (max-width: 40rem) {
  .table-panel {
    overflow-x: visible;
  }

  table,
  tbody,
  tr,
  td {
    display: block;
  }

  thead {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }

  tr {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-line);
  }

  tbody tr:last-child {
    border-bottom: none;
  }

  td {
    padding: 0;
    border: none;
  }

  td[data-label] {
    display: grid;
    grid-template-columns: 7.5rem 1fr;
    gap: var(--space-3);
    overflow-wrap: anywhere;
  }

  td[data-label]::before {
    content: attr(data-label);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-muted);
  }

  .cell-actions {
    text-align: left;
    margin-left: calc(var(--space-3) * -1);
  }
}
</style>
