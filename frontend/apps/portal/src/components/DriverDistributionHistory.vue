<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeftRight, ArrowRight, Check, ChevronDown, History, LockOpen, Minus, Plus } from '@lucide/vue'
import { BaseCard } from '@maragobus/shared'
import type { DistributionChange } from '../types/college-distribution'
import { formatTransportDateTime } from '../utils/format-transport-date'

const props = defineProps<{ history: readonly DistributionChange[] }>()

const eventDetails = {
  created: { label: 'Criação', icon: Plus },
  assigned: { label: 'Atribuição', icon: ArrowRight },
  transferred: { label: 'Transferência', icon: ArrowLeftRight },
  removed: { label: 'Remoção', icon: Minus },
  published: { label: 'Publicação', icon: Check },
  reopened: { label: 'Reabertura', icon: LockOpen },
}
const events = computed(() => props.history.map((change, index) => ({ change, index, timestamp: Date.parse(change.at) }))
  .sort((left, right) => right.timestamp - left.timestamp || right.index - left.index))

function describe(change: DistributionChange): string {
  switch (change.type) {
    case 'created': return 'Rascunho da distribuição criado.'
    case 'assigned': return `${change.college} atribuída a ${change.driver.name}.`
    case 'transferred': return `${change.college} transferida de ${change.previousDriver.name} para ${change.driver.name}.`
    case 'removed': return `Atribuição de ${change.college} removida de ${change.previousDriver.name}.`
    case 'published': return 'Distribuição publicada.'
    case 'reopened': return 'Distribuição reaberta para edição.'
  }
}
</script>

<template>
  <BaseCard class="[&>.mb-card__body]:p-0">
    <details class="group">
      <summary class="flex min-w-0 cursor-pointer list-none items-center gap-3 rounded-control px-4 py-3.5
        hover:bg-hover focus-visible:outline-offset-[-3px] sm:px-6 [&::-webkit-details-marker]:hidden">
        <History :size="20" class="shrink-0 text-identity" aria-hidden="true" />
        <span class="min-w-0 flex-1">
          <span class="block text-body font-semibold text-heading">Histórico de alterações</span>
          <span class="block text-helper text-muted">
            {{ history.length }} {{ history.length === 1 ? 'alteração' : 'alterações' }}
          </span>
        </span>
        <ChevronDown :size="20" class="shrink-0 text-identity group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div class="mx-4 border-t border-line py-4 sm:mx-6">
        <ol v-if="events.length" role="list" aria-label="Alterações da distribuição">
          <li v-for="{ change, index, timestamp } in events" :key="index"
            class="relative flex min-w-0 items-start gap-3 pb-4 last:pb-0
              before:absolute before:inset-y-0 before:left-4 before:w-px before:bg-line last:before:hidden">
            <span class="relative grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-identity">
              <component :is="eventDetails[change.type].icon" :size="16" aria-hidden="true" />
            </span>
            <div class="min-w-0 flex-1 wrap-anywhere">
              <p class="text-body font-semibold text-heading">{{ eventDetails[change.type].label }}</p>
              <p class="flex flex-wrap gap-x-3 text-helper text-muted">
                <span>{{ change.author.name }}</span>
                <time :datetime="change.at">{{ formatTransportDateTime(timestamp) }}</time>
              </p>
              <p class="mt-1 text-body">{{ describe(change) }}</p>
            </div>
          </li>
        </ol>
        <p v-else class="text-body text-muted">Nenhuma alteração registrada para esta data.</p>
      </div>
    </details>
  </BaseCard>
</template>
