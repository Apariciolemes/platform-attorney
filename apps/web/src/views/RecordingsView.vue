<script setup lang="ts">
import { onMounted } from 'vue'
import { useRecordings } from '@/composables/useRecordings'
import type { Recording, RecordingStatus } from '@/types/recording'

const { recordings, loading, uploadProgress, error, load, upload, retry, remove, audioUrl } =
  useRecordings()

const statusLabel: Record<RecordingStatus, string> = {
  pending: 'Na fila',
  processing: 'Transcrevendo…',
  completed: 'Concluído',
  failed: 'Falhou',
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  await upload(file)
  input.value = ''
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`
}

function formatDuration(seconds: number | null) {
  if (seconds == null) return null
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

async function confirmRemove(recording: Recording) {
  if (confirm(`Remover ${recording.originalName}?`)) await remove(recording.id)
}

onMounted(load)
</script>

<template>
  <section class="card">
    <h2>Enviar áudio</h2>
    <p class="muted">mp3, m4a, wav, ogg, webm… até 25 MB. A transcrição roda em segundo plano.</p>
    <div class="upload">
      <input
        type="file"
        accept="audio/*"
        :disabled="uploadProgress !== null"
        @change="onFileChange"
      />
      <span v-if="uploadProgress !== null" class="muted">Enviando… {{ uploadProgress }}%</span>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
  </section>

  <section class="card">
    <h2>Gravações</h2>
    <p v-if="loading && !recordings.length" class="muted">Carregando…</p>
    <p v-else-if="!recordings.length" class="muted">Nenhum áudio enviado ainda.</p>

    <article v-for="rec in recordings" :key="rec.id" class="recording">
      <header>
        <div>
          <strong>{{ rec.originalName }}</strong>
          <span class="muted">
            · {{ formatSize(rec.sizeBytes) }}
            <template v-if="formatDuration(rec.durationSeconds)">
              · {{ formatDuration(rec.durationSeconds) }}
            </template>
          </span>
        </div>
        <span class="badge" :class="rec.status">{{ statusLabel[rec.status] }}</span>
      </header>

      <audio :src="audioUrl(rec.id)" controls preload="none" />

      <p v-if="rec.transcript" class="transcript">{{ rec.transcript }}</p>
      <p v-else-if="rec.status === 'failed'" class="error">{{ rec.error }}</p>

      <div class="actions">
        <button v-if="rec.status === 'failed'" type="button" @click="retry(rec.id)">
          Tentar de novo
        </button>
        <button type="button" class="danger" @click="confirmRemove(rec)">Remover</button>
      </div>
    </article>
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
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}
.upload {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
}
.recording {
  border-top: 1px solid var(--border);
  padding: 1rem 0;
  display: grid;
  gap: 0.6rem;
}
.recording:first-of-type {
  border-top: none;
}
.recording header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  flex-wrap: wrap;
}
audio {
  width: 100%;
  max-width: 480px;
}
.transcript {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.6;
}
.badge {
  font-size: 0.8rem;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--muted);
  white-space: nowrap;
}
.badge.completed {
  color: var(--primary);
  border-color: var(--primary);
}
.badge.failed {
  color: var(--danger);
  border-color: var(--danger);
}
.actions {
  display: flex;
  gap: 0.5rem;
}
button {
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
}
button.danger {
  color: var(--danger);
}
.muted {
  color: var(--muted);
  margin: 0;
}
.error {
  color: var(--danger);
  margin: 0.5rem 0 0;
}
</style>
