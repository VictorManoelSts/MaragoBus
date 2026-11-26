<script setup lang="ts">
import { formatCivilDate } from '../utils/format-transport-date'
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { BaseAlert, BaseBadge, BaseButton, BaseCard, BaseModal } from '@maragobus/shared'
import { useTransportClock } from '../composables/useTransportClock'
import { useReservationsStore } from '../stores/reservations'
import { getCancellationDeadline, getTransportDate } from '../utils/reservation-availability'
import { getReceiptAvailability } from '../utils/reservation-receipt'

const store = useReservationsStore()
const { reference, refresh } = useTransportClock()
const today = computed(() => getTransportDate(reference.value))
const filters = [
  { value: 'all', label: 'Todas' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'cancelled', label: 'Canceladas' },
] as const
const filter = ref<(typeof filters)[number]['value']>('all')
const emptyMessages = {
  all: 'Você ainda não tem reservas.',
  confirmed: 'Você não tem reservas confirmadas.',
  cancelled: 'Você não tem reservas canceladas.',
} as const
const statusLabels = { confirmed: 'Confirmada', cancelled: 'Cancelada' } as const
const cancellationId = ref<string | null>(null)
const cancellationTarget = computed(() => store.studentReservations.find(item => item.id === cancellationId.value))
const cancellationResult = ref<ReturnType<typeof store.cancel> | null>(null)
const cancellationFeedback = ref<HTMLElement>()
const pageHeading = ref<HTMLElement>()
const deadlineMessage = 'Prazo de cancelamento encerrado. O limite é às 16h do dia da viagem (horário de Alagoas).'

function deadlinePassed(date: string) {
  return reference.value >= getCancellationDeadline(date)
}

function closeCancellation() {
  cancellationId.value = null
}

function cancellationFocusFallback() {
  return cancellationFeedback.value ?? pageHeading.value
}

function confirmCancellation() {
  if (!cancellationId.value) return
  cancellationResult.value = store.cancel(cancellationId.value)
  closeCancellation()
  refresh()
}

watch(() => store.studentId, () => {
  closeCancellation()
  cancellationResult.value = null
})

const groups = computed(() => {
  const date = today.value
  const reservations = store.studentReservations
    .filter(item => filter.value === 'all' || item.status === filter.value)
    .sort((left, right) => left.travelDate.localeCompare(right.travelDate))
  return [
    { key: 'today', title: 'Hoje', items: reservations.filter(item => item.travelDate === date) },
    { key: 'future', title: 'Futuras', items: reservations.filter(item => item.travelDate > date) },
    { key: 'past', title: 'Anteriores', items: reservations.filter(item => item.travelDate < date).reverse() },
  ].filter(group => group.items.length > 0)
})
</script>

<template>
  <div class="student-reservations min-w-0 space-y-5">
    <div class="space-y-3">
      <h1 ref="pageHeading" tabindex="-1" class="text-page">Minhas reservas</h1>
      <p class="max-w-prose text-helper text-muted">As reservas de demonstração ficam disponíveis até recarregar a aplicação.</p>
    </div>

    <BaseAlert v-if="cancellationResult" :variant="cancellationResult === 'cancelled' ? 'success' : 'warning'">
      <p ref="cancellationFeedback" tabindex="-1">
        <template v-if="cancellationResult === 'cancelled'">Reserva de demonstração cancelada.</template>
        <template v-else-if="cancellationResult === 'deadline-passed'">{{ deadlineMessage }}</template>
        <template v-else-if="cancellationResult === 'already-cancelled'">Esta reserva já está cancelada.</template>
        <template v-else>A reserva selecionada não está disponível.</template>
      </p>
    </BaseAlert>

    <fieldset class="grid w-full min-w-0 max-w-sm grid-cols-3 gap-1 rounded-control border border-line bg-app p-1">
      <legend class="sr-only">Filtrar reservas por situação</legend>
      <label v-for="option in filters" :key="option.value" class="min-w-0 cursor-pointer">
        <input v-model="filter" type="radio" name="reservation-status" :value="option.value" class="peer sr-only">
        <span
          class="flex min-h-11 items-center justify-center rounded-control px-1 text-center text-xs text-content wrap-anywhere
            hover:bg-surface peer-checked:bg-identity peer-checked:font-semibold peer-checked:text-on-primary
            peer-checked:hover:bg-identity peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2
            peer-focus-visible:outline-identity sm:text-helper"
        >{{ option.label }}</span>
      </label>
    </fieldset>

    <BaseCard v-if="!groups.length">
      <div class="space-y-3">
        <p class="text-body" role="status">{{ emptyMessages[filter] }}</p>
        <RouterLink
          v-if="filter === 'all'"
          :to="{ name: 'home' }" class="mb-button mb-button--primary mb-button--sm w-full sm:w-auto"
        >Fazer reserva</RouterLink>
      </div>
    </BaseCard>

    <template v-else>
      <section v-for="group in groups" :key="group.key" :aria-labelledby="`reservations-${group.key}`" class="space-y-2">
        <h2 :id="`reservations-${group.key}`" class="text-section">{{ group.title }}</h2>
        <ul class="grid min-w-0 gap-3 lg:grid-cols-2">
          <li v-for="reservation in group.items" :key="reservation.id" class="min-w-0">
            <BaseCard>
              <div class="space-y-2">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <time :datetime="reservation.travelDate" class="text-subtitle">
                    {{ formatCivilDate(reservation.travelDate) }}
                  </time>
                  <BaseBadge :variant="reservation.status === 'cancelled' ? 'danger' : 'success'">
                    {{ statusLabels[reservation.status] }}
                  </BaseBadge>
                </div>
                <dl class="grid min-w-0 gap-2 sm:grid-cols-2">
                  <div>
                    <dt class="text-helper text-muted">Faculdade</dt>
                    <dd class="text-helper">{{ reservation.college }}</dd>
                  </div>
                  <div>
                    <dt class="text-helper text-muted">Ponto de embarque</dt>
                    <dd class="text-helper">{{ reservation.boardingPoint }}</dd>
                  </div>
                </dl>
                <div v-if="reservation.status === 'confirmed' && reservation.travelDate >= today" class="space-y-2">
                  <p v-if="deadlinePassed(reservation.travelDate)" class="text-helper text-muted">{{ deadlineMessage }}</p>
                  <div class="flex flex-wrap gap-2">
                    <BaseButton
                      v-if="!deadlinePassed(reservation.travelDate)" variant="outline" size="sm"
                      class="w-full sm:w-auto" @click="cancellationId = reservation.id"
                    >
                      Cancelar reserva
                    </BaseButton>
                    <RouterLink
                      v-if="getReceiptAvailability(reservation, reference) === 'available'"
                      :to="{ name: 'receipt' }" class="mb-button mb-button--primary mb-button--sm w-full sm:w-auto"
                    >
                      Ver comprovante
                    </RouterLink>
                  </div>
                  <p v-if="getReceiptAvailability(reservation, reference) === 'future'" class="text-helper text-muted">
                    O comprovante estará disponível a partir das 00h do dia da viagem (horário de Alagoas).
                  </p>
                </div>
              </div>
            </BaseCard>
          </li>
        </ul>
      </section>
    </template>

    <BaseModal
      :model-value="Boolean(cancellationTarget)" title="Cancelar reserva"
      :focus-fallback="cancellationFocusFallback" @update:model-value="closeCancellation"
    >
      <template v-if="cancellationTarget">
        <p>
          Deseja cancelar a reserva de
          <time :datetime="cancellationTarget.travelDate">{{ formatCivilDate(cancellationTarget.travelDate) }}</time>?
        </p>
        <p v-if="deadlinePassed(cancellationTarget.travelDate)" class="mt-3 text-helper text-muted">{{ deadlineMessage }}</p>
      </template>
      <template #footer>
        <BaseButton variant="outline" @click="closeCancellation">Voltar</BaseButton>
        <BaseButton
          :disabled="!cancellationTarget || deadlinePassed(cancellationTarget.travelDate) || cancellationTarget.status !== 'confirmed'"
          @click="confirmCancellation"
        >
          Confirmar cancelamento
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.student-reservations {
  --mb-success: #166534;
  --mb-success-surface: #ecfdf3;
  --mb-success-border: #78aa89;
  --mb-danger: #991b1b;
  --mb-danger-surface: #fef2f2;
  --mb-danger-border: #d69797;
}
</style>
