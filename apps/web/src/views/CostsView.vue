<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCosts } from '@/composables/useCosts'
import type { RecordingStatus } from '@/types/recording'
import {
  dateTimeFormat,
  formatBrl,
  formatDate,
  formatDuration,
  formatMinutes,
  formatUsd,
} from '@/utils/format'

const { costs, loading, error, usdToBrl, usdPerMinute, load, costForMinutes } = useCosts()

const simulatedMinutes = ref(60)

const referenceDurations = [
  { label: '1 minuto', minutes: 1 },
  { label: '10 minutos', minutes: 10 },
  { label: '30 minutos', minutes: 30 },
  { label: '1 hora', minutes: 60 },
  { label: '10 horas', minutes: 600 },
]

const notBilledLabel: Record<Exclude<RecordingStatus, 'completed'>, string> = {
  pending: 'Na fila',
  processing: 'Transcrevendo',
  failed: 'Falhou, sem cobrança',
}

const pricing = computed(() => costs.value?.pricing ?? null)

const savingPercent = computed(() => {
  const p = pricing.value
  if (!p?.usdPerMinute || p.replacementUsdPerMinute == null) return null
  return Math.round((1 - p.replacementUsdPerMinute / p.usdPerMinute) * 100)
})

/**
 * Estimativa de quanto custa revisar 1 hora de áudio: ~150 palavras faladas por minuto
 * ≈ 200 tokens em português, lidos e reescritos, mais as instruções (~800 tokens).
 */
const correctionPerHourUsd = computed(() => {
  const price = costs.value?.correction.price
  if (!price) return null
  const textTokens = 200 * 60
  return (
    ((textTokens + 800) * price.usdPerMillionInputTokens +
      textTokens * price.usdPerMillionOutputTokens) /
    1_000_000
  )
})

/** ", que custa US$ 0,0045 por minuto (25% a menos)" */
const replacementPriceText = computed(() => {
  const price = pricing.value?.replacementUsdPerMinute
  if (price == null) return ''
  const saving = savingPercent.value ? ` (${savingPercent.value}% a menos)` : ''
  return `, que custa ${formatUsd(price)} por minuto${saving}`
})

const simulatedCost = computed(() => {
  const minutes = Number(simulatedMinutes.value)
  return Number.isFinite(minutes) && minutes >= 0 ? costForMinutes(minutes) : null
})

/** "US$ 0,36 (≈ R$ 1,98)" quando há cotação informada. */
function withBrl(usd: number): string {
  return usdToBrl.value ? `${formatUsd(usd)} (≈ ${formatBrl(usd * usdToBrl.value)})` : formatUsd(usd)
}

function onRateInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value.replace(',', '.'))
  usdToBrl.value = Number.isFinite(value) && value > 0 ? value : null
}

/*
 * Tabela no desktop; no celular (< sm) cada linha vira um bloco empilhado,
 * com o rótulo da coluna vindo de data-label.
 */
const th = 'px-4 py-3 text-left text-sm font-semibold whitespace-nowrap text-muted'
const tdBase = 'border-b border-line px-4 py-3 align-middle max-sm:border-0 max-sm:p-0'
const td = `${tdBase} max-sm:block`
const labeledTd = `${tdBase} max-sm:grid max-sm:grid-cols-[8.5rem_1fr] max-sm:gap-3 max-sm:before:text-sm max-sm:before:font-semibold max-sm:before:text-muted max-sm:before:content-[attr(data-label)]`

onMounted(load)
</script>

<template>
  <div class="grid gap-8">
    <header class="grid gap-2">
      <h1 class="text-2xl">Custos</h1>
      <p class="max-w-[60ch] text-muted">
        Quanto custa cada áudio. A transcrição é cobrada por minuto de áudio; a revisão do texto
        por IA, pelo tamanho do texto, e custa bem menos.
      </p>
    </header>

    <p v-if="loading && !costs" class="text-muted">Carregando custos…</p>
    <p v-else-if="error" class="text-danger" role="alert">{{ error }}</p>

    <template v-else-if="costs && pricing">
      <!-- Preço atual -->
      <section class="grid gap-4" aria-labelledby="price-title">
        <h2 id="price-title" class="text-lg">Preço atual</h2>
        <div class="panel grid gap-4">
          <p v-if="pricing.usdPerMinute != null" class="text-xl font-semibold tabular-nums">
            {{ formatUsd(pricing.usdPerMinute) }}
            <span class="text-base font-normal text-muted">por minuto de áudio</span>
          </p>
          <p v-else class="text-danger">
            Preço desconhecido para {{ pricing.provider }} / {{ pricing.model }}. Defina
            <code>STT_PRICE_PER_MINUTE_USD</code> no <code>.env</code> para calcular os custos.
          </p>

          <dl class="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            <dt class="font-semibold text-muted">Transcrição</dt>
            <dd>{{ pricing.provider }}, modelo <code>{{ pricing.model }}</code></dd>
            <template v-if="pricing.usdPerMinute != null">
              <dt class="font-semibold text-muted">Uma hora de áudio</dt>
              <dd class="tabular-nums">{{ withBrl(pricing.usdPerMinute * 60) }}</dd>
            </template>
            <template v-if="pricing.sourceUrl && pricing.checkedAt">
              <dt class="font-semibold text-muted">Fonte</dt>
              <dd>
                <a
                  :href="pricing.sourceUrl"
                  target="_blank"
                  rel="noopener"
                  class="text-primary underline underline-offset-2"
                >
                  Tabela de preços oficial</a
                >, conferida em {{ formatDate(pricing.checkedAt) }}
              </dd>
            </template>
            <dt class="font-semibold text-muted">Revisão do texto</dt>
            <dd>
              <template v-if="costs.correction.price">
                Modelo <code>{{ costs.correction.model }}</code>,
                {{ formatUsd(costs.correction.price.usdPerMillionInputTokens) }} por milhão de
                tokens lidos e {{ formatUsd(costs.correction.price.usdPerMillionOutputTokens) }} por
                milhão de tokens escritos
                <span v-if="correctionPerHourUsd != null" class="text-muted">
                  (≈ {{ formatUsd(correctionPerHourUsd) }} por hora de áudio)</span
                >
              </template>
              <template v-else>
                Modelo <code>{{ costs.correction.model }}</code>, preço desconhecido
              </template>
            </dd>
          </dl>

          <div
            v-if="pricing.shutdownDate"
            class="grid gap-1 rounded-sm bg-warning-bg px-4 py-3 text-sm"
            role="note"
          >
            <p class="font-semibold text-warning">
              O modelo {{ pricing.model }} será desligado em {{ formatDate(pricing.shutdownDate) }}
            </p>
            <p v-if="pricing.replacementModel">
              O substituto indicado é o <code>{{ pricing.replacementModel }}</code>{{
                replacementPriceText
              }}. Para trocar, mude <code>STT_MODEL</code> no <code>.env</code>.
            </p>
          </div>
        </div>
      </section>

      <!-- Simulador -->
      <section
        v-if="usdPerMinute != null"
        class="grid gap-4"
        aria-labelledby="simulator-title"
      >
        <h2 id="simulator-title" class="text-lg">Quanto vai custar</h2>
        <div class="panel grid gap-6 lg:grid-cols-2">
          <div class="grid content-start gap-4">
            <div class="grid gap-1">
              <label class="field-label" for="sim-minutes">Duração do áudio, em minutos</label>
              <input
                id="sim-minutes"
                v-model.number="simulatedMinutes"
                class="input max-w-48 tabular-nums"
                type="number"
                min="0"
                step="1"
                inputmode="decimal"
              />
            </div>
            <p class="text-lg tabular-nums" aria-live="polite">
              <template v-if="simulatedCost != null">
                Custo estimado: <strong>{{ withBrl(simulatedCost) }}</strong>
              </template>
              <template v-else>Informe uma duração válida.</template>
            </p>
            <div class="grid gap-1">
              <label class="field-label" for="usd-brl">
                Cotação do dólar, em reais <span class="font-normal text-muted">(opcional)</span>
              </label>
              <input
                id="usd-brl"
                class="input max-w-48 tabular-nums"
                inputmode="decimal"
                placeholder="Ex.: 5,40"
                :value="usdToBrl ?? ''"
                aria-describedby="usd-brl-hint"
                @input="onRateInput"
              />
              <p id="usd-brl-hint" class="text-sm text-muted">
                Para ver os valores também em reais. A cobrança é feita em dólar no cartão.
              </p>
            </div>
          </div>

          <table class="w-full self-start border-collapse text-left">
            <caption class="sr-only">
              Custo estimado por duração de áudio
            </caption>
            <thead>
              <tr class="border-b border-line">
                <th scope="col" class="py-2 pr-4 text-sm font-semibold text-muted">Áudio</th>
                <th scope="col" class="py-2 text-right text-sm font-semibold text-muted">
                  Custo estimado
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="ref in referenceDurations"
                :key="ref.minutes"
                class="border-b border-line last:border-b-0"
              >
                <td class="py-2 pr-4">{{ ref.label }}</td>
                <td class="py-2 text-right tabular-nums">
                  {{ withBrl(costForMinutes(ref.minutes) ?? 0) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Gasto até agora -->
      <section class="grid gap-4" aria-labelledby="spent-title">
        <h2 id="spent-title" class="text-lg">Gasto até agora</h2>
        <p class="max-w-[70ch] text-muted">
          Estimativa: a transcrição pela duração de cada áudio e o preço atual; a revisão pelos
          tokens realmente gastos. A fatura
          real fica no
          <a
            href="https://platform.openai.com/usage"
            target="_blank"
            rel="noopener"
            class="text-primary underline underline-offset-2"
            >painel de uso da OpenAI</a
          >.
        </p>

        <dl class="panel grid gap-4 sm:grid-cols-3">
          <div class="grid gap-1">
            <dt class="text-sm font-semibold text-muted">Total estimado</dt>
            <dd class="text-xl font-semibold tabular-nums">
              {{ costs.totals.costUsd != null ? formatUsd(costs.totals.costUsd) : 'Sem preço' }}
            </dd>
            <dd
              v-if="usdToBrl && costs.totals.costUsd != null"
              class="text-sm text-muted tabular-nums"
            >
              ≈ {{ formatBrl(costs.totals.costUsd * usdToBrl) }}
            </dd>
            <dd class="text-sm text-muted tabular-nums">
              Transcrição
              {{
                costs.totals.transcriptionCostUsd != null
                  ? formatUsd(costs.totals.transcriptionCostUsd)
                  : 'sem preço'
              }}
              · revisão {{ formatUsd(costs.totals.correctionCostUsd) }}
            </dd>
          </div>
          <div class="grid gap-1">
            <dt class="text-sm font-semibold text-muted">Áudio transcrito</dt>
            <dd class="text-xl font-semibold tabular-nums">
              {{ formatMinutes(costs.totals.transcribedSeconds) }}
            </dd>
          </div>
          <div class="grid gap-1">
            <dt class="text-sm font-semibold text-muted">Gravações transcritas</dt>
            <dd class="text-xl font-semibold tabular-nums">
              {{ costs.totals.transcribedRecordings }}
            </dd>
          </div>
        </dl>

        <p v-if="!costs.recordings.length" class="text-muted">
          Nenhuma gravação enviada ainda. Os custos aparecem aqui depois da primeira transcrição.
        </p>
        <div v-else class="panel overflow-x-auto p-0! max-sm:overflow-visible">
          <table class="w-full border-collapse max-sm:block">
            <caption class="sr-only">
              Custo estimado de cada gravação
            </caption>
            <thead class="max-sm:sr-only">
              <tr class="border-b border-line">
                <th scope="col" :class="th">Gravação</th>
                <th scope="col" :class="th">Enviada em</th>
                <th scope="col" :class="th">Duração</th>
                <th scope="col" :class="th" class="text-right">Transcrição</th>
                <th scope="col" :class="th" class="text-right">Revisão</th>
                <th scope="col" :class="th" class="text-right">Total</th>
              </tr>
            </thead>
            <tbody class="max-sm:block">
              <tr
                v-for="rec in costs.recordings"
                :key="rec.recordingId"
                class="[&:last-child>td]:border-b-0 max-sm:grid max-sm:gap-2 max-sm:border-b max-sm:border-line max-sm:p-4 max-sm:last:border-b-0"
              >
                <td :class="td" class="font-semibold wrap-anywhere">{{ rec.originalName }}</td>
                <td :class="labeledTd" class="tabular-nums" data-label="Enviada em">
                  {{ dateTimeFormat.format(new Date(rec.createdAt)) }}
                </td>
                <td :class="labeledTd" class="tabular-nums" data-label="Duração">
                  <span v-if="rec.durationSeconds != null">{{
                    formatDuration(rec.durationSeconds)
                  }}</span>
                  <span v-else class="text-muted">Desconhecida</span>
                </td>
                <td :class="labeledTd" data-label="Transcrição" class="text-right tabular-nums max-sm:text-left">
                  <span v-if="rec.transcriptionCostUsd != null">{{
                    formatUsd(rec.transcriptionCostUsd)
                  }}</span>
                  <span v-else-if="rec.status !== 'completed'" class="text-muted">
                    {{ notBilledLabel[rec.status] }}
                  </span>
                  <span v-else class="text-muted">Sem preço</span>
                </td>
                <td :class="labeledTd" data-label="Revisão" class="text-right tabular-nums max-sm:text-left">
                  <span v-if="rec.correctionCostUsd != null">{{
                    formatUsd(rec.correctionCostUsd)
                  }}</span>
                  <span v-else class="text-muted">Sem revisão</span>
                </td>
                <td :class="labeledTd" data-label="Total" class="text-right font-semibold tabular-nums max-sm:text-left">
                  <span v-if="rec.costUsd != null">{{ withBrl(rec.costUsd) }}</span>
                  <span v-else class="text-muted">Sem preço</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>
