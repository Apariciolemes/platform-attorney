<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useClients } from '@/composables/useClients'
import type { Client, ClientInput } from '@/types/client'

const { clients, loading, error, fetchClients, saveClient, removeClient } = useClients()

const emptyForm = (): ClientInput => ({ name: '', email: '', document: '', phone: '' })
const form = reactive<ClientInput>(emptyForm())
const editingId = ref<string | null>(null)

const submitLabel = computed(() => (editingId.value ? 'Salvar alterações' : 'Cadastrar'))

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
  if (confirm(`Remover ${client.name}?`)) await removeClient(client.id)
}

onMounted(fetchClients)
</script>

<template>
  <section class="card">
    <h2>{{ editingId ? 'Editar cliente' : 'Novo cliente' }}</h2>
    <form class="form" @submit.prevent="submit">
      <input v-model="form.name" placeholder="Nome" required maxlength="150" />
      <input v-model="form.email" type="email" placeholder="E-mail" required maxlength="150" />
      <input v-model="form.document" placeholder="CPF/CNPJ" maxlength="20" />
      <input v-model="form.phone" placeholder="Telefone" maxlength="20" />
      <div class="actions">
        <button type="submit" class="primary" :disabled="loading">{{ submitLabel }}</button>
        <button v-if="editingId" type="button" @click="resetForm">Cancelar</button>
      </div>
    </form>
    <p v-if="error" class="error">{{ error }}</p>
  </section>

  <section class="card">
    <h2>Clientes</h2>
    <p v-if="loading && !clients.length" class="muted">Carregando…</p>
    <p v-else-if="!clients.length" class="muted">Nenhum cliente cadastrado.</p>
    <table v-else>
      <thead>
        <tr>
          <th>Nome</th>
          <th>E-mail</th>
          <th>Documento</th>
          <th>Telefone</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr v-for="client in clients" :key="client.id">
          <td>{{ client.name }}</td>
          <td>{{ client.email }}</td>
          <td>{{ client.document ?? '—' }}</td>
          <td>{{ client.phone ?? '—' }}</td>
          <td class="row-actions">
            <button type="button" @click="edit(client)">Editar</button>
            <button type="button" class="danger" @click="confirmRemove(client)">Remover</button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1.25rem;
  margin-bottom: 1.25rem;
}
h2 {
  margin: 0 0 1rem;
  font-size: 1.1rem;
}
.form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}
input {
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
}
.actions,
.row-actions {
  display: flex;
  gap: 0.5rem;
}
button {
  padding: 0.5rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
}
button.primary {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--primary-contrast);
}
button.danger {
  color: var(--danger);
}
button:disabled {
  opacity: 0.6;
  cursor: progress;
}
table {
  width: 100%;
  border-collapse: collapse;
}
.card:has(table) {
  overflow-x: auto;
}
th,
td {
  text-align: left;
  padding: 0.6rem 0.5rem;
  border-bottom: 1px solid var(--border);
}
th {
  color: var(--muted);
  font-weight: 600;
  font-size: 0.85rem;
}
.muted {
  color: var(--muted);
}
.error {
  color: var(--danger);
  margin: 0.75rem 0 0;
}
</style>
