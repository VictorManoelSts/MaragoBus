<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { CalendarDays, GraduationCap, MapPin } from '@lucide/vue'
import { BaseAlert, BaseBadge, BaseButton, BaseCard, BaseSelect } from '@maragobus/shared'
import { useSessionStore } from '@maragobus/shared/auth/session'
import ReservationReceiptModal from '../components/ReservationReceiptModal.vue'
import { useReservationReceipt } from '../composables/useReservationReceipt'
import { mockTransportClosures } from '../mocks/transport-closures'
import { useReservationsStore } from '../stores/reservations'
import { useStudentDemoStore } from '../stores/student-demo'
import { useStudentProfileStore } from '../stores/student-profile'
import type { TransportClosure } from '../types/reservation-availability'
import type { ReservationFormContext } from '../types/reservation-form'
import { formatCivilDate, formatTransportDateTime } from '../utils/format-transport-date'
import { getReservationAvailability, getTransportDate, transportTimeZone } from '../utils/reservation-availability'
import { getReceiptAvailability } from '../utils/reservation-receipt'

const props = withDefaults(defineProps<{
  context?: ReservationFormContext
  closures?: readonly TransportClosure[]
}>(), {
  closures: () => mockTransportClosures,
})

const session = useSessionStore()
const reservations = useReservationsStore()
const profile = useStudentProfileStore()
const demo = useStudentDemoStore()
const { reference, refresh, receipt, receiptUnavailable, openReceipt, closeReceipt } = useReservationReceipt()
const today = computed(() => getTransportDate(reference.value))
const summary = computed(() => reservations.getHomeSummary(today.value))
const studentName = computed(() => session.user?.name.trim().split(/\s+/)[0])

const context = computed(() => props.context ?? profile.reservationContext)
const closures = computed(() => demo.scenario?.closures ?? props.closures)
const availability = computed(() => getReservationAvailability(reference.value, closures.value))
const openWindow = computed(() => availability.value.status === 'open' ? availability.value.window : null)
const nextWindow = computed(() => availability.value.status === 'open' ? null : availability.value.nextWindow)
const closure = computed(() => availability.value.status === 'no-service' ? availability.value.closure : null)
const targetDate = computed(() => openWindow.value?.travelDate ?? nextWindow.value?.travelDate)
const targetReservation = computed(() => openWindow.value && reservations.findReservation(openWindow.value.travelDate))
const futureCancellation = computed(() => targetReservation.value && targetReservation.value.travelDate > today.value
  && targetReservation.value.status === 'cancelled' ? targetReservation.value : null)

const options = computed(() => context.value.boardingPoints.map(point => ({ value: point.id, label: point.name })))
const pointOverride = ref<string | null>(null)
const selectedPointId = computed({
  get: () => {
    const id = pointOverride.value ?? context.value.defaultBoardingPointId
    return options.value.some(option => option.value === id) ? id ?? '' : ''
  },
  set: pointId => { pointOverride.value = pointId },
})
const availabilityChanged = ref(false)
const lastConfirmedId = ref<string>()
const currentTitle = ref<HTMLHeadingElement>()
const upcomingTitle = ref<HTMLHeadingElement>()
watch(targetDate, () => { pointOverride.value = null }, { flush: 'sync' })
watch(() => reservations.studentId, () => {
  pointOverride.value = null
  lastConfirmedId.value = undefined
  availabilityChanged.value = false
}, { flush: 'sync' })

const confirmationRequest = computed(() => ({
  travelDate: openWindow.value?.travelDate ?? null,
  context: context.value,
  boardingPointId: selectedPointId.value,
  closures: closures.value,
}))
const eligibility = computed(() => reservations.validateConfirmation(confirmationRequest.value, availability.value).status)
const showForm = computed(() => eligibility.value === 'ready' || (eligibility.value === 'point-required' && options.value.length > 0))
const unavailableReason = computed(() => {
  switch (eligibility.value) {
    case 'student-required': return 'Entre com uma conta de aluno para reservar.'
    case 'college-required': return 'Para reservar, você precisa ter uma faculdade cadastrada.'
    case 'point-required': return 'Nenhum ponto de embarque disponível.'
  }
})
const announcement = computed(() => {
  const visibleReservation = [summary.value.currentReservation, summary.value.futureReservation]
    .find(reservation => reservation?.id === lastConfirmedId.value)
  return visibleReservation?.status === 'confirmed'
    ? `Reserva confirmada para ${formatCivilDate(visibleReservation.travelDate)}.`
    : ''
})

async function confirmReservation() {
  // A store revalida a data que o aluno revisou, inclusive na virada do horário.
  const result = reservations.confirm(confirmationRequest.value)
  availabilityChanged.value = result.status === 'unavailable'
  refresh()
  if (result.status === 'confirmed') {
    lastConfirmedId.value = result.reservation.id
    await nextTick()
    const title = result.reservation.travelDate === today.value ? currentTitle : upcomingTitle
    if (lastConfirmedId.value === result.reservation.id) title.value?.focus()
  }
}

const transportHourFormat = new Intl.DateTimeFormat('pt-BR', {
  timeStyle: 'short', timeZone: transportTimeZone,
})
</script>

<template>
  <div class="student-home min-w-0 space-y-4">
    <header class="space-y-1">
      <h1 class="text-page">{{ studentName ? `Olá, ${studentName}!` : 'Olá!' }}</h1>
      <p class="max-w-prose text-body text-muted">Acompanhe e gerencie suas reservas de transporte.</p>
    </header>

    <section v-if="summary.currentReservation" aria-labelledby="current-reservation-title">
      <BaseCard>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 id="current-reservation-title" ref="currentTitle" tabindex="-1" class="text-subtitle">Sua reserva atual</h2>
          <BaseBadge :variant="summary.currentReservation.status === 'confirmed' ? 'success' : 'danger'">
            {{ summary.currentReservation.status === 'confirmed' ? 'Confirmada' : 'Cancelada' }}
          </BaseBadge>
        </div>
        <dl class="mt-3 grid gap-3 text-helper sm:grid-cols-3">
          <div class="flex min-w-0 items-start gap-2">
            <CalendarDays :size="18" class="shrink-0 text-identity" aria-hidden="true" />
            <div><dt class="text-muted">Data da viagem</dt><dd><time :datetime="summary.currentReservation.travelDate">{{ formatCivilDate(summary.currentReservation.travelDate) }}</time></dd></div>
          </div>
          <div class="flex min-w-0 items-start gap-2">
            <GraduationCap :size="18" class="shrink-0 text-identity" aria-hidden="true" />
            <div class="min-w-0"><dt class="text-muted">Faculdade</dt><dd class="wrap-break-word">{{ summary.currentReservation.college }}</dd></div>
          </div>
          <div class="flex min-w-0 items-start gap-2">
            <MapPin :size="18" class="shrink-0 text-identity" aria-hidden="true" />
            <div class="min-w-0"><dt class="text-muted">Ponto de embarque</dt><dd class="wrap-break-word">{{ summary.currentReservation.boardingPoint }}</dd></div>
          </div>
        </dl>
        <div class="mt-3 flex flex-wrap gap-2">
          <BaseButton
            v-if="getReceiptAvailability(summary.currentReservation, reference) === 'available'"
            class="w-full sm:w-auto" size="sm" @click="openReceipt(summary.currentReservation.id)"
          >Ver comprovante</BaseButton>
          <RouterLink to="/reservas" class="mb-button mb-button--outline mb-button--sm w-full sm:w-auto">Ver minha reserva</RouterLink>
        </div>
      </BaseCard>
    </section>

    <section v-if="summary.futureReservation" aria-labelledby="next-reservation-title">
      <BaseCard>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 id="next-reservation-title" ref="upcomingTitle" tabindex="-1" class="text-subtitle">Próxima reserva</h2>
          <BaseBadge variant="success">Confirmada</BaseBadge>
        </div>
        <p class="mt-2 flex items-center gap-2 text-helper">
          <CalendarDays :size="18" class="shrink-0 text-identity" aria-hidden="true" />
          <time :datetime="summary.futureReservation.travelDate">{{ formatCivilDate(summary.futureReservation.travelDate) }}</time>
        </p>
        <p class="mt-1 text-helper text-muted">Comprovante disponível a partir das 00h do dia da viagem (horário de Alagoas).</p>
      </BaseCard>
    </section>

    <section v-if="futureCancellation" aria-labelledby="cancelled-reservation-title">
      <BaseCard>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 id="cancelled-reservation-title" class="text-subtitle">Próxima viagem</h2>
          <BaseBadge variant="danger">Cancelada</BaseBadge>
        </div>
        <p class="mt-2 flex items-center gap-2 text-helper">
          <CalendarDays :size="18" class="shrink-0 text-identity" aria-hidden="true" />
          <time :datetime="futureCancellation.travelDate">{{ formatCivilDate(futureCancellation.travelDate) }}</time>
        </p>
      </BaseCard>
    </section>

    <BaseAlert v-if="availabilityChanged" variant="warning">
      A disponibilidade mudou. Confira a data da viagem antes de tentar confirmar novamente.
    </BaseAlert>

    <section v-if="showForm && openWindow" aria-labelledby="reservation-form-title">
      <BaseCard>
        <form class="space-y-3" @submit.prevent="confirmReservation">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 id="reservation-form-title" class="text-subtitle">Fazer reserva</h2>
            <BaseBadge variant="success">Reservas abertas</BaseBadge>
          </div>
          <dl class="grid gap-3 text-helper sm:grid-cols-2">
            <div class="flex min-w-0 items-start gap-2">
              <CalendarDays :size="18" class="shrink-0 text-identity" aria-hidden="true" />
              <div><dt class="text-muted">Data da viagem</dt><dd><time :datetime="openWindow.travelDate">{{ formatCivilDate(openWindow.travelDate) }}</time></dd></div>
            </div>
            <div class="flex min-w-0 items-start gap-2">
              <GraduationCap :size="18" class="shrink-0 text-identity" aria-hidden="true" />
              <div class="min-w-0"><dt class="text-muted">Faculdade</dt><dd class="wrap-break-word">{{ context.college }}</dd></div>
            </div>
          </dl>
          <p class="text-helper text-muted">Encerramento às <time :datetime="openWindow.closesAt.toISOString()">{{ transportHourFormat.format(openWindow.closesAt) }}</time> do dia da viagem (horário de Alagoas).</p>
          <BaseSelect
            id="reservation-boarding-point" v-model="selectedPointId"
            label="Ponto de embarque" :options="options" placeholder="Escolha um ponto de embarque"
            help="Alterações no ponto valem apenas para esta reserva."
          />
          <BaseButton type="submit" :disabled="eligibility !== 'ready'" class="w-full sm:w-auto">Confirmar reserva</BaseButton>
        </form>
      </BaseCard>
    </section>
    <BaseAlert v-else-if="!openWindow" variant="warning" :title="closure ? 'Transporte interrompido' : 'Reservas fechadas'">
      <template v-if="closure">
        <p>Não haverá transporte em <time :datetime="closure.date">{{ formatCivilDate(closure.date) }}</time>.</p>
        <p v-if="closure.reason">{{ closure.reason }}</p>
        <p v-if="closure.description">{{ closure.description }}</p>
      </template>
      <template v-if="nextWindow">
        <p>Próxima abertura em <time :datetime="nextWindow.opensAt.toISOString()">{{ formatTransportDateTime(nextWindow.opensAt) }}</time> (horário de Alagoas).</p>
        <p>Viagem em <time :datetime="nextWindow.travelDate">{{ formatCivilDate(nextWindow.travelDate) }}</time>.</p>
      </template>
    </BaseAlert>
    <BaseAlert v-else-if="unavailableReason" variant="warning" title="Reserva indisponível">{{ unavailableReason }}</BaseAlert>

    <p class="sr-only" role="status">{{ announcement }}</p>
    <BaseAlert v-if="receiptUnavailable" variant="info">O comprovante desta reserva está indisponível.</BaseAlert>
    <ReservationReceiptModal :reservation="receipt" @close="closeReceipt" />
  </div>
</template>

<style scoped>
.student-home {
  --mb-success: #166534;
  --mb-success-surface: #ecfdf3;
  --mb-success-border: #78aa89;
  --mb-danger: #991b1b;
  --mb-danger-surface: #fef2f2;
  --mb-danger-border: #d69797;
  --mb-warning: #854d0e;
  --mb-warning-surface: #fffbeb;
  --mb-warning-border: #c6a35e;
}

.student-home :deep(.mb-card__body) {
  padding: 1rem;
}
</style>
