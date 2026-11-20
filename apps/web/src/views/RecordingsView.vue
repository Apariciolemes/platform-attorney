<script setup lang="ts">
import { onMounted } from 'vue'
import { useRecordings } from '@/composables/useRecordings'
import type { Recording, RecordingStatus } from '@/types/recording'

const { recordings, loading, uploadProgress, error, load, upload, retry, remove, audioUrl } =
  useRecordings()

const statusLabel: Record<RecordingStatus, string> = {
  pending: 'Na fila',
  processing: 'Transcrevendo',
  completed: 'Transcrito',
  failed: 'Falhou',
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  await upload(file)
  input.value = ''
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
    : `${Math.ceil(bytes / 1024)} KB`
}

function formatDuration(seconds: number | null) {
  if (seconds == null) return null
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

async function confirmRemove(recording: Recording) {
  if (confirm(`Remover a gravação ${recording.originalName} e a transcrição dela?`)) {
    await remove(recording.id)
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <header class="page-header">
      <h1>Gravações</h1>
      <p>Envie o áudio de uma reunião ou audiência e leia a transcrição em português.</p>
    </header>

    <section class="section" aria-labelledby="upload-title">
      <h2 id="upload-title">Enviar áudio</h2>
      <div class="panel upload">
        <div class="upload-control">
          <input
            id="audio-file"
            class="visually-hidden file-input"
            type="file"
            accept="audio/*"
            aria-describedby="audio-file-hint"
            :disabled="uploadProgress !== null"
            @change="onFileChange"
          />
          <label
            for="audio-file"
            class="btn btn-primary"
            :aria-disabled="uploadProgress !== null"
          >
            Escolher arquivo de áudio
          </label>
          <p id="audio-file-hint" class="hint">
            MP3, M4A, WAV, OGG ou WEBM, até 25 MB. A transcrição aparece na lista abaixo em
            alguns segundos.
          </p>
        </div>

        <div v-if="uploadProgress !== null" class="upload-progress">
          <label for="upload-progress" class="hint numeric">
            Enviando… {{ uploadProgress }}%
          </label>
          <progress id="upload-progress" max="100" :value="uploadProgress" />
        </div>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </div>
    </section>

    <section class="section" aria-labelledby="recordings-title">
      <div class="section-header">
        <h2 id="recordings-title">Enviadas</h2>
        <span v-if="recordings.length" class="muted numeric">
          {{ recordings.length }} {{ recordings.length === 1 ? 'gravação' : 'gravações' }}
        </span>
      </div>

      <p v-if="loading && !recordings.length" class="muted">Carregando gravações…</p>
      <p v-else-if="!recordings.length" class="muted">
        Nenhum áudio enviado ainda. O primeiro que você enviar aparece aqui.
      </p>

      <ul v-else class="panel recording-list" role="list">
        <li v-for="rec in recordings" :key="rec.id" class="recording">
          <div class="recording-header">
            <div class="recording-title">
              <h3>{{ rec.originalName }}</h3>
              <p class="hint numeric">
                {{ dateFormat.format(new Date(rec.createdAt)) }} ·
                {{ formatSize(rec.sizeBytes) }}
                <template v-if="formatDuration(rec.durationSeconds)">
                  · {{ formatDuration(rec.durationSeconds) }}
                </template>
              </p>
            </div>
            <span class="badge" :class="`badge-${rec.status}`">{{ statusLabel[rec.status] }}</span>
          </div>

          <audio :src="audioUrl(rec.id)" controls preload="none">
            Seu navegador não reproduz este áudio.
          </audio>

          <p v-if="rec.transcript" class="transcript">{{ rec.transcript }}</p>
          <p v-else-if="rec.status === 'failed'" class="error failure">
            Não foi possível transcrever: {{ rec.error }}
          </p>
          <p v-else class="hint">A transcrição aparece aqui quando ficar pronta.</p>

          <div class="recording-actions">
            <button
              v-if="rec.status === 'failed'"
              type="button"
              class="btn btn-quiet"
              @click="retry(rec.id)"
            >
              Tentar de novo
            </button>
            <button type="button" class="btn btn-quiet btn-danger" @click="confirmRemove(rec)">
              Remover<span class="visually-hidden"> {{ rec.originalName }}</span>
            </button>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.upload {
  display: grid;
  gap: var(--space-4);
}

.upload-control {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.upload-control .hint {
  flex: 1 1 18rem;
  max-width: 60ch;
}

/* O input real fica escondido; o rótulo faz o papel de botão e recebe o foco visível. */
.file-input:focus-visible + label {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

label[aria-disabled='true'] {
  opacity: 0.6;
  cursor: not-allowed;
}

.upload-progress {
  display: grid;
  gap: var(--space-1);
  max-width: 24rem;
}

progress {
  width: 100%;
  height: 0.5rem;
  accent-color: var(--color-primary);
}

.recording-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.recording {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-6);
  border-bottom: 1px solid var(--color-line);
}

.recording:last-child {
  border-bottom: none;
}

@media (max-width: 40rem) {
  .recording {
    padding: var(--space-4);
  }
}

.recording-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.recording-title {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.recording-title h3 {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  overflow-wrap: anywhere;
}

audio {
  width: 100%;
  max-width: 28rem;
  height: 2.5rem;
}

.transcript {
  max-width: 70ch;
  white-space: pre-wrap;
  line-height: 1.6;
}

.failure {
  max-width: 70ch;
}

.recording-actions {
  display: flex;
  gap: var(--space-2);
  margin-left: calc(var(--space-3) * -1);
}
</style>
