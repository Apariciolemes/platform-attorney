<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useRecording } from '@/composables/useRecording'
import { dateTimeFormat, formatDuration } from '@/utils/format'
import { paragraphs, stageBadgeClass } from '@/utils/recording-stage'

const route = useRoute()
const router = useRouter()
const { recording, stage, loading, notFound, error, busy, load, retry, requestCorrection, remove, audioUrl } =
  useRecording(() => String(route.params.id))

type TextVersion = 'corrected' | 'original'
const version = ref<TextVersion>('corrected')

const hasCorrected = computed(() => Boolean(recording.value?.correctedTranscript))
const correctionRunning = computed(
  () =>
    recording.value?.correctionStatus === 'pending' ||
    recording.value?.correctionStatus === 'processing',
)

/** Mostra o revisado quando existe; senão, o original. */
const shownVersion = computed<TextVersion>(() =>
  version.value === 'corrected' && hasCorrected.value ? 'corrected' : 'original',
)
const shownText = computed(() => {
  const rec = recording.value
  if (!rec) return null
  return shownVersion.value === 'corrected' ? rec.correctedTranscript : rec.transcript
})

// Quando a revisão termina enquanto a página está aberta, passa a mostrar o texto revisado.
watch(hasCorrected, (now, before) => {
  if (now && !before) version.value = 'corrected'
})

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
    : `${Math.ceil(bytes / 1024)} KB`
}

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined
async function copyText() {
  if (!shownText.value) return
  try {
    await navigator.clipboard.writeText(shownText.value)
    copied.value = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => (copied.value = false), 2000)
  } catch {
    error.value = 'Não foi possível copiar. Selecione o texto e copie manualmente.'
  }
}

async function confirmRemove() {
  const rec = recording.value
  if (!rec) return
  if (confirm(`Remover a gravação ${rec.originalName} e a transcrição dela?`) && (await remove())) {
    await router.push('/recordings')
  }
}

const tabClass = (active: boolean) =>
  [
    'rounded-sm px-3 py-1.5 text-sm font-semibold transition-colors duration-150',
    active ? 'bg-surface text-ink ring-1 ring-line' : 'text-muted hover:text-ink',
  ].join(' ')

onMounted(load)
</script>

<template>
  <div class="grid gap-8">
    <RouterLink
      to="/recordings"
      class="justify-self-start text-sm font-semibold text-primary underline-offset-2 hover:underline"
    >
      ← Todas as gravações
    </RouterLink>

    <p v-if="loading && !recording" class="text-muted">Carregando gravação…</p>
    <div v-else-if="notFound" class="grid gap-2">
      <h1 class="text-2xl">Gravação não encontrada</h1>
      <p class="text-muted">Ela pode ter sido removida.</p>
    </div>

    <template v-else-if="recording && stage">
      <header class="grid gap-3">
        <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <h1 class="min-w-0 text-xl wrap-anywhere sm:text-2xl">{{ recording.originalName }}</h1>
          <span class="badge" :class="stageBadgeClass[stage.tone]">{{ stage.label }}</span>
        </div>
        <p class="text-sm text-muted tabular-nums">
          Enviada em {{ dateTimeFormat.format(new Date(recording.createdAt)) }} ·
          {{ formatSize(recording.sizeBytes) }}
          <template v-if="recording.durationSeconds != null">
            · {{ formatDuration(recording.durationSeconds) }} de áudio
          </template>
        </p>
        <audio class="h-10 w-full max-w-xl" :src="audioUrl()" controls preload="metadata">
          Seu navegador não reproduz este áudio.
        </audio>
      </header>

      <p v-if="error" class="text-danger" role="alert">{{ error }}</p>

      <!-- Transcrição ainda não disponível -->
      <section v-if="recording.status !== 'completed'" class="panel grid gap-3">
        <template v-if="recording.status === 'failed'">
          <h2 class="text-lg">Não foi possível transcrever</h2>
          <p class="max-w-[70ch] text-danger">{{ recording.error }}</p>
          <div>
            <button type="button" class="btn" :disabled="busy" @click="retry">
              Tentar de novo
            </button>
          </div>
        </template>
        <template v-else>
          <h2 class="text-lg">{{ stage.label }}…</h2>
          <p class="text-muted">
            O texto aparece aqui sozinho quando a transcrição ficar pronta. Áudios curtos levam
            alguns segundos.
          </p>
        </template>
      </section>

      <!-- Texto -->
      <section v-else class="grid gap-4" aria-labelledby="text-title">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 id="text-title" class="text-lg">Texto</h2>
          <div class="flex flex-wrap items-center gap-3">
            <div
              v-if="hasCorrected"
              class="inline-flex gap-1 rounded-md bg-neutral-bg p-1"
              role="tablist"
              aria-label="Versão do texto"
            >
              <button
                type="button"
                role="tab"
                :aria-selected="shownVersion === 'corrected'"
                :class="tabClass(shownVersion === 'corrected')"
                @click="version = 'corrected'"
              >
                Revisado
              </button>
              <button
                type="button"
                role="tab"
                :aria-selected="shownVersion === 'original'"
                :class="tabClass(shownVersion === 'original')"
                @click="version = 'original'"
              >
                Original
              </button>
            </div>
            <button type="button" class="btn" @click="copyText">
              {{ copied ? 'Copiado' : 'Copiar texto' }}
            </button>
            <span class="sr-only" aria-live="polite">{{ copied ? 'Texto copiado' : '' }}</span>
          </div>
        </div>

        <!-- Situação da revisão -->
        <div
          v-if="correctionRunning"
          class="rounded-sm bg-warning-bg px-4 py-3 text-sm"
          role="status"
        >
          <p>
            <strong class="text-warning">A IA está revisando o texto.</strong>
            Enquanto isso, abaixo está a transcrição original.
          </p>
        </div>
        <div
          v-else-if="recording.correctionStatus === 'failed'"
          class="grid gap-2 rounded-sm bg-danger-bg px-4 py-3 text-sm"
          role="note"
        >
          <p>
            <strong class="text-danger">A revisão do texto falhou.</strong>
            A transcrição original está abaixo.
          </p>
          <p class="text-muted">{{ recording.correctionError }}</p>
          <div>
            <button type="button" class="btn btn-quiet -ml-3" :disabled="busy" @click="requestCorrection">
              Tentar revisar de novo
            </button>
          </div>
        </div>
        <div
          v-else-if="recording.correctionStatus === null"
          class="flex flex-wrap items-center justify-between gap-3 rounded-sm bg-neutral-bg px-4 py-3 text-sm"
        >
          <p>Este texto ainda não foi revisado pela IA.</p>
          <button type="button" class="btn btn-primary" :disabled="busy" @click="requestCorrection">
            Revisar texto com IA
          </button>
        </div>

        <article
          :id="`text-${shownVersion}`"
          class="panel grid gap-4 py-6 sm:px-8 sm:py-8"
          role="tabpanel"
          :aria-label="shownVersion === 'corrected' ? 'Texto revisado' : 'Transcrição original'"
        >
          <p
            v-for="(paragraph, i) in paragraphs(shownText ?? '')"
            :key="i"
            class="max-w-[70ch] text-base leading-relaxed sm:text-lg"
          >
            {{ paragraph }}
          </p>
          <p v-if="!shownText" class="text-muted">A transcrição veio vazia (áudio sem fala?).</p>
        </article>

        <p v-if="shownVersion === 'corrected'" class="max-w-[70ch] text-sm text-muted">
          Revisado por IA ({{ recording.correctionModel }}) para corrigir concordância, pontuação e
          clareza, sem mudar o sentido. Em trechos importantes, confira o áudio ou a versão original.
        </p>
        <p v-else-if="hasCorrected" class="max-w-[70ch] text-sm text-muted">
          Transcrição exatamente como saiu do reconhecimento de fala, antes da revisão.
        </p>
      </section>

      <footer class="flex flex-wrap gap-3 border-t border-line pt-6">
        <button
          v-if="recording.correctionStatus === 'completed'"
          type="button"
          class="btn"
          :disabled="busy"
          @click="requestCorrection"
        >
          Revisar de novo
        </button>
        <button type="button" class="btn btn-danger" :disabled="busy" @click="confirmRemove">
          Remover gravação
        </button>
      </footer>
    </template>
  </div>
</template>
