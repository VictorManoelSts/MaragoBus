<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { BaseBadge, BaseCard, BaseSelect } from '@maragobus/shared'
import { useWarningRequestsStore, warningRequestLabels } from '../stores/warning-requests'
import { formatCivilDate, formatTransportDateTime } from '../utils/format-transport-date'

const store = useWarningRequestsStore()
const status = ref('all')
const statusOptions = [
  { value: 'all', label: 'Todas' },
  ...Object.entries(warningRequestLabels).map(([value, label]) => ({ value, label })),
]
const filtered = computed(() => store.ownRequests.filter(item => status.value === 'all' || item.status === status.value))
</script>

<template>
  <div class="min-w-0 space-y-6">
    <h1 class="text-page">Solicitações de advertência</h1>

    <RouterLink :to="{ name: 'driver-reservations' }" class="mb-button mb-button--outline mb-button--md">
      Consultar reservas
    </RouterLink>

    <div class="sm:max-w-xs">
      <BaseSelect id="driver-warning-status" v-model="status" label="Filtrar por situação" :options="statusOptions" />
    </div>

    <p v-if="!store.ownRequests.length" role="status" class="text-body text-muted">
      Você ainda não enviou solicitações de advertência.
    </p>
    <p v-else-if="!filtered.length" role="status" class="text-body text-muted">
      Nenhuma solicitação para a situação selecionada.
    </p>

    <ul v-else aria-label="Minhas solicitações de advertência" class="grid gap-4 sm:grid-cols-2">
      <li v-for="item in filtered" :key="item.id" class="min-w-0">
        <BaseCard class="h-full wrap-anywhere">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <h2 class="text-subtitle">{{ item.studentName || 'Nome indisponível' }}</h2>
            <BaseBadge>{{ warningRequestLabels[item.status] }}</BaseBadge>
          </div>
          <dl class="mt-3 space-y-3">
            <div>
              <dt class="text-helper text-muted">Data da viagem</dt>
              <dd><time :datetime="item.travelDate">{{ formatCivilDate(item.travelDate) }}</time></dd>
            </div>
            <div>
              <dt class="text-helper text-muted">Enviada em (horário de Alagoas)</dt>
              <dd><time :datetime="item.createdAt">{{ formatTransportDateTime(item.createdAt) }}</time></dd>
            </div>
            <div>
              <dt class="text-helper text-muted">Motivo</dt>
              <dd class="whitespace-pre-wrap">{{ item.reason }}</dd>
            </div>
          </dl>
        </BaseCard>
      </li>
    </ul>
  </div>
</template>
