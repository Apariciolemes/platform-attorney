<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useRecordings } from '@/composables/useRecordings'
import type { Recording } from '@/types/recording'
import { dateTimeFormat, formatDuration } from '@/utils/format'
import { readableText, recordingStage, stageBadgeClass } from '@/utils/recording-stage'

const { recordings, loading, uploadProgress, error, load, upload, retry, remove } = useRecordings()

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

async function confirmRemove(recording: Recording) {
  if (confirm(`Remover a gravação ${recording.originalName} e a transcrição dela?`)) {
    await remove(recording.id)
  }
}

onMounted(load)
</script>

<template>
  <div class="grid gap-8">
    <header class="grid gap-2">
      <h1 class="text-2xl">Gravações</h1>
      <p class="max-w-[60ch] text-muted">
        Envie o áudio de uma reunião ou audiência. A transcrição é revisada por IA e fica pronta para leitura.
      </p>
    </header>

    <section class="grid gap-4" aria-labelledby="upload-title">
      <h2 id="upload-title" class="text-lg">Enviar áudio</h2>
      <div class="panel grid gap-4">
        <div class="flex flex-wrap items-center gap-4">
          <!-- O input real fica escondido; o rótulo faz o papel de botão e recebe o foco visível. -->
          <input
            id="audio-file"
            class="peer sr-only"
            type="file"
            accept="audio/*"
            aria-describedby="audio-file-hint"
            :disabled="uploadProgress !== null"
            @change="onFileChange"
          />
          <label
            for="audio-file"
            class="btn btn-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
            :aria-disabled="uploadProgress !== null"
          >
            Escolher arquivo de áudio
          </label>
          <p id="audio-file-hint" class="max-w-[60ch] flex-[1_1_18rem] text-sm text-muted">
            MP3, M4A, WAV, OGG ou WEBM, até 25 MB. A transcrição aparece na lista abaixo em
            alguns segundos.
          </p>
        </div>

        <div v-if="uploadProgress !== null" class="grid max-w-sm gap-1">
          <label for="upload-progress" class="text-sm text-muted tabular-nums">
            Enviando… {{ uploadProgress }}%
          </label>
          <progress
            id="upload-progress"
            class="h-2 w-full accent-primary"
            max="100"
            :value="uploadProgress"
          />
        </div>
        <p v-if="error" class="text-danger" role="alert">{{ error }}</p>
      </div>
    </section>

    <section class="grid gap-4" aria-labelledby="recordings-title">
      <div class="flex flex-wrap items-baseline justify-between gap-4">
        <h2 id="recordings-title" class="text-lg">Enviadas</h2>
        <span v-if="recordings.length" class="text-muted tabular-nums">
          {{ recordings.length }} {{ recordings.length === 1 ? 'gravação' : 'gravações' }}
        </span>
      </div>

      <p v-if="loading && !recordings.length" class="text-muted">Carregando gravações…</p>
      <p v-else-if="!recordings.length" class="text-muted">
        Nenhum áudio enviado ainda. O primeiro que você enviar aparece aqui.
      </p>

      <ul v-else class="panel m-0 list-none divide-y divide-line p-0!" role="list">
        <li
          v-for="rec in recordings"
          :key="rec.id"
          class="relative grid gap-2 p-4 transition-colors duration-150 hover:bg-bg sm:p-6"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="grid min-w-0 gap-1">
              <h3 class="font-sans text-base wrap-anywhere">
                <!-- O link cobre o item inteiro (::after), mas os botões ficam por cima. -->
                <RouterLink
                  :to="`/recordings/${rec.id}`"
                  class="text-ink no-underline after:absolute after:inset-0 hover:underline"
                >
                  {{ rec.originalName }}
                </RouterLink>
              </h3>
              <p class="text-sm text-muted tabular-nums">
                {{ dateTimeFormat.format(new Date(rec.createdAt)) }} ·
                {{ formatSize(rec.sizeBytes) }}
                <template v-if="rec.durationSeconds != null">
                  · {{ formatDuration(rec.durationSeconds) }}
                </template>
              </p>
            </div>
            <span class="badge" :class="stageBadgeClass[recordingStage(rec).tone]">
              {{ recordingStage(rec).label }}
            </span>
          </div>

          <p v-if="readableText(rec)" class="line-clamp-3 max-w-[70ch] text-muted">
            {{ readableText(rec) }}
          </p>
          <p v-else-if="rec.status === 'failed'" class="max-w-[70ch] text-danger">
            Não foi possível transcrever: {{ rec.error }}
          </p>
          <p v-else class="text-sm text-muted">A transcrição aparece aqui quando ficar pronta.</p>

          <div class="relative -ml-3 flex flex-wrap gap-2">
            <RouterLink
              v-if="rec.transcript"
              :to="`/recordings/${rec.id}`"
              class="btn btn-quiet text-primary no-underline"
            >
              Ler transcrição<span class="sr-only"> de {{ rec.originalName }}</span>
            </RouterLink>
            <button
              v-if="rec.status === 'failed'"
              type="button"
              class="btn btn-quiet"
              @click="retry(rec.id)"
            >
              Tentar de novo
            </button>
            <button type="button" class="btn btn-quiet btn-danger" @click="confirmRemove(rec)">
              Remover<span class="sr-only"> {{ rec.originalName }}</span>
            </button>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
