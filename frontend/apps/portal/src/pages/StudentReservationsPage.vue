<script setup lang="ts">
import { formatCivilDate } from '../utils/format-transport-date'
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { BaseAlert, BaseBadge, BaseButton, BaseCard, BaseModal, BaseSelect } from '@maragobus/shared'
import ReservationReceiptModal from '../components/ReservationReceiptModal.vue'
import { useReservationReceipt } from '../composables/useReservationReceipt'
import { useReservationsStore } from '../stores/reservations'
import { getCancellationDeadline, getTransportDate } from '../utils/reservation-availability'
import { getReceiptAvailability } from '../utils/reservation-receipt'

const store = useReservationsStore()
const { reference, refresh, receipt, receiptUnavailable, openReceipt, closeReceipt } = useReservationReceipt()
const today = computed(() => getTransportDate(reference.value))
const filter = ref('all')
const filters = [
  { value: 'all', label: 'Todas' },
  { value: 'today', label: 'De hoje' },
  { value: 'future', label: 'Futuras' },
  { value: 'past', label: 'Anteriores' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'cancelled', label: 'Canceladas' },
]
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
  const status = filter.value === 'confirmed' || filter.value === 'cancelled' ? filter.value : null
  const reservations = store.studentReservations
    .filter(item => !status || item.status === status)
    .sort((left, right) => left.travelDate.localeCompare(right.travelDate))
  return [
    { key: 'today', title: 'Hoje', items: reservations.filter(item => item.travelDate === date) },
    { key: 'future', title: 'Futuras', items: reservations.filter(item => item.travelDate > date) },
    { key: 'past', title: 'Anteriores', items: reservations.filter(item => item.travelDate < date).reverse() },
  ].filter(group => group.items.length > 0 &&
    (filter.value === 'all' || status || filter.value === group.key))
})
</script>

<template>
  <div class="min-w-0 space-y-8">
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
    <BaseAlert v-if="receiptUnavailable" variant="info">O comprovante desta reserva está indisponível.</BaseAlert>

    <BaseCard v-if="!store.studentReservations.length">
      <div class="space-y-5">
        <p class="text-body">Você ainda não tem reservas.</p>
        <RouterLink :to="{ name: 'home' }" class="mb-button mb-button--primary mb-button--md w-full sm:w-auto">
          Fazer reserva
        </RouterLink>
      </div>
    </BaseCard>

    <template v-else>
      <div class="sm:max-w-xs">
        <BaseSelect v-model="filter" label="Filtrar por situação" :options="filters" />
      </div>
      <p v-if="!groups.length" role="status" class="text-body text-muted">Nenhuma reserva para o filtro selecionado.</p>

      <section v-for="group in groups" :key="group.key" :aria-labelledby="`reservations-${group.key}`" class="space-y-4">
        <h2 :id="`reservations-${group.key}`" class="text-section">{{ group.title }}</h2>
        <ul class="grid min-w-0 gap-4 lg:grid-cols-2">
          <li v-for="reservation in group.items" :key="reservation.id" class="min-w-0">
            <BaseCard>
              <div class="space-y-4">
                <div class="flex flex-wrap items-center gap-3">
                  <time :datetime="reservation.travelDate" class="text-subtitle">
                    {{ formatCivilDate(reservation.travelDate) }}
                  </time>
                  <BaseBadge :variant="reservation.status === 'cancelled' ? 'warning' : 'neutral'">
                    {{ statusLabels[reservation.status] }}
                  </BaseBadge>
                </div>
                <dl class="grid min-w-0 gap-3 sm:grid-cols-2">
                  <div>
                    <dt class="text-helper text-muted">Faculdade de destino</dt>
                    <dd class="text-body">{{ reservation.college }}</dd>
                  </div>
                  <div>
                    <dt class="text-helper text-muted">Ponto de embarque</dt>
                    <dd class="text-body">{{ reservation.boardingPoint }}</dd>
                  </div>
                </dl>
              </div>
              <template v-if="reservation.status === 'confirmed'" #footer>
                <div class="space-y-3">
                  <p v-if="deadlinePassed(reservation.travelDate)" class="text-helper text-muted">{{ deadlineMessage }}</p>
                  <div class="flex flex-wrap gap-3">
                    <BaseButton
                      v-if="!deadlinePassed(reservation.travelDate)" variant="outline"
                      class="w-full sm:w-auto" @click="cancellationId = reservation.id"
                    >
                      Cancelar reserva
                    </BaseButton>
                    <BaseButton
                      v-if="getReceiptAvailability(reservation, reference) === 'available'"
                      class="w-full sm:w-auto" @click="openReceipt(reservation.id)"
                    >
                      Ver comprovante
                    </BaseButton>
                  </div>
                  <p v-if="getReceiptAvailability(reservation, reference) === 'future'" class="text-helper text-muted">
                    O comprovante estará disponível a partir das 00h do dia da viagem (horário de Alagoas).
                  </p>
                </div>
              </template>
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
    <ReservationReceiptModal :reservation="receipt" @close="closeReceipt" />
  </div>
</template>
