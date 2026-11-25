<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BaseAlert, BaseButton, BaseCard, BaseSelect } from '@maragobus/shared'
import { useTransportClock } from '../composables/useTransportClock'
import { mockTransportClosures } from '../mocks/transport-closures'
import { useReservationsStore } from '../stores/reservations'
import { useStudentProfileStore } from '../stores/student-profile'
import type { TransportClosure } from '../types/reservation-availability'
import type { ReservationFormContext } from '../types/reservation-form'
import { getReservationAvailability, getTransportDate, transportTimeZone } from '../utils/reservation-availability'

const props = withDefaults(defineProps<{
  context?: ReservationFormContext
  closures?: readonly TransportClosure[]
}>(), {
  closures: () => mockTransportClosures,
})

const reservations = useReservationsStore()
const profile = useStudentProfileStore()
const context = computed(() => props.context ?? profile.reservationContext)
const { reference, refresh } = useTransportClock()
const availability = computed(() => getReservationAvailability(reference.value, props.closures))
const openWindow = computed(() => availability.value.status === 'open' ? availability.value.window : null)
const nextWindow = computed(() => availability.value.status === 'open' ? null : availability.value.nextWindow)
const closure = computed(() => availability.value.status === 'no-service' ? availability.value.closure : null)
function defaultPointId() {
  const { boardingPoints, defaultBoardingPointId } = context.value
  return boardingPoints.find(point => point.id === defaultBoardingPointId)?.id ?? ''
}

const pointOverride = ref<string | null>(null)
const selectedPointId = computed({
  get: () => pointOverride.value ?? defaultPointId(),
  set: pointId => { pointOverride.value = pointId },
})
const targetDate = computed(() => openWindow.value?.travelDate ?? nextWindow.value?.travelDate)
const lastConfirmedId = ref<string | null>(null)
const availabilityChanged = ref(false)
watch(targetDate, () => { pointOverride.value = null })
watch(() => reservations.studentId, () => {
  pointOverride.value = null
  lastConfirmedId.value = null
  availabilityChanged.value = false
})
const options = computed(() => context.value.boardingPoints.map(point => ({ value: point.id, label: point.name })))
const selectedPoint = computed(() => context.value.boardingPoints.find(point => point.id === selectedPointId.value))
const confirmationRequest = computed(() => ({
  travelDate: openWindow.value?.travelDate ?? null,
  context: context.value,
  boardingPointId: selectedPointId.value,
  closures: props.closures,
}))
const eligibility = computed(() => reservations.validateConfirmation(confirmationRequest.value, availability.value).status)
const existingReservation = computed(() => {
  const date = openWindow.value?.travelDate ?? getTransportDate(reference.value)
  return reservations.findReservation(date)
})
const confirmationHelp = computed(() => {
  if (existingReservation.value?.status === 'cancelled') return 'Há uma reserva cancelada registrada para esta data.'
  if (existingReservation.value) return 'Você já tem uma reserva para esta data.'
  switch (eligibility.value) {
    case 'student-required': return 'Entre com uma conta de aluno para confirmar.'
    case 'unavailable': return 'Aguarde uma janela aberta para confirmar.'
    case 'college-required': return 'A confirmação exige uma faculdade cadastrada no modelo de demonstração do aluno.'
    case 'point-required': return 'Selecione um ponto de embarque para confirmar.'
    default: return 'Confira os dados da viagem antes de confirmar.'
  }
})

function confirmReservation() {
  // Preserve the date the student reviewed, even when the clock has already crossed a boundary.
  const result = reservations.confirm(confirmationRequest.value)
  availabilityChanged.value = result.status === 'unavailable'
  if (result.status === 'confirmed') {
    lastConfirmedId.value = result.reservation.id
  }
  refresh()
}

const civilDateFormat = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
})
const transportDateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: transportTimeZone,
})
const transportHourFormat = new Intl.DateTimeFormat('pt-BR', {
  timeStyle: 'short', timeZone: transportTimeZone,
})
function formatDate(date: string) {
  const label = civilDateFormat.format(new Date(`${date}T00:00:00Z`))
  return label.charAt(0).toUpperCase() + label.slice(1)
}
const collegeLabel = computed(() => context.value.college?.trim() || 'Faculdade não informada neste modelo de demonstração.')
</script>

<template>
  <div class="min-w-0 space-y-8">
    <div class="space-y-3">
      <h1 class="text-page">Fazer reserva</h1>
      <p class="max-w-prose text-body text-muted">Confira as informações da viagem e selecione seu ponto de embarque.</p>
    </div>

    <BaseAlert variant="info">
      Os pontos de embarque são dados de demonstração. As reservas simuladas ficam disponíveis até recarregar a aplicação.
    </BaseAlert>

    <BaseCard>
      <BaseAlert
        :variant="openWindow ? 'success' : closure ? 'warning' : 'info'"
        :title="openWindow ? 'Reservas abertas' : 'Reservas fechadas'"
      >
        <template v-if="openWindow">
          <p>Encerramento às <time :datetime="openWindow.closesAt.toISOString()">{{ transportHourFormat.format(openWindow.closesAt) }}</time> do dia da viagem (horário de Alagoas).</p>
        </template>
        <template v-else-if="nextWindow">
          <template v-if="closure">
            <p>Não haverá transporte em <time :datetime="closure.date">{{ formatDate(closure.date) }}</time>.</p>
            <p v-if="closure.reason">{{ closure.reason }}</p>
            <p v-if="closure.description">{{ closure.description }}</p>
            <p>Não é possível reservar para essa data.</p>
          </template>
          <p>Próxima abertura conhecida em <time :datetime="nextWindow.opensAt.toISOString()">{{ transportDateTimeFormat.format(nextWindow.opensAt) }}</time> (horário de Alagoas).</p>
          <p>Viagem em <time :datetime="nextWindow.travelDate">{{ formatDate(nextWindow.travelDate) }}</time>.</p>
        </template>
      </BaseAlert>

      <BaseAlert v-if="availabilityChanged" variant="warning" class="mt-6">
        A disponibilidade mudou. Confira a data da viagem antes de tentar confirmar novamente.
      </BaseAlert>

      <BaseAlert
        v-if="existingReservation"
        :variant="existingReservation.status === 'cancelled' ? 'warning' : 'success'"
        :title="existingReservation.status === 'cancelled' ? 'Reserva de demonstração cancelada'
          : existingReservation.id === lastConfirmedId
          ? 'Reserva de demonstração confirmada!' : 'Reserva de demonstração já confirmada'"
        class="mt-6"
      >
        <dl class="grid min-w-0 gap-4 text-helper sm:grid-cols-2">
          <div>
            <dt>Data da viagem</dt>
            <dd><time :datetime="existingReservation.travelDate">{{ formatDate(existingReservation.travelDate) }}</time></dd>
          </div>
          <div>
            <dt>Faculdade</dt>
            <dd>{{ existingReservation.college }}</dd>
          </div>
          <div>
            <dt>Ponto de embarque</dt>
            <dd>{{ existingReservation.boardingPoint }}</dd>
          </div>
        </dl>
      </BaseAlert>

      <div v-else-if="openWindow" class="mt-6 space-y-6">
        <dl class="grid min-w-0 gap-5 sm:grid-cols-2">
          <div class="min-w-0 space-y-1">
            <dt class="text-helper text-muted">Data da viagem</dt>
            <dd class="text-body"><time :datetime="openWindow.travelDate">{{ formatDate(openWindow.travelDate) }}</time></dd>
          </div>
          <div class="min-w-0 space-y-1">
            <dt class="text-helper text-muted">Faculdade de destino</dt>
            <dd class="text-body">{{ collegeLabel }}</dd>
          </div>
        </dl>

        <BaseSelect
          id="reservation-boarding-point"
          v-model="selectedPointId"
          label="Ponto de embarque"
          :options="options"
          placeholder="Escolha um ponto de embarque"
          help="Escolha apenas para esta demonstração de reserva. O ponto padrão do seu perfil não será alterado."
        />

        <section aria-labelledby="reservation-summary-title" class="space-y-3 border-t border-line pt-6">
          <h2 id="reservation-summary-title" class="text-subtitle">Resumo da seleção</h2>
          <dl class="grid min-w-0 gap-4 text-helper sm:grid-cols-2">
            <div class="min-w-0 space-y-1">
              <dt class="text-muted">Data da viagem</dt>
              <dd>{{ formatDate(openWindow.travelDate) }}</dd>
            </div>
            <div class="min-w-0 space-y-1">
              <dt class="text-muted">Faculdade</dt>
              <dd>{{ collegeLabel }}</dd>
            </div>
            <div class="min-w-0 space-y-1 sm:col-span-2">
              <dt class="text-muted">Ponto de embarque</dt>
              <dd aria-live="polite" aria-atomic="true">{{ selectedPoint?.name ?? 'Nenhum ponto selecionado.' }}</dd>
            </div>
          </dl>
        </section>
      </div>
      <template #footer>
        <div class="space-y-3">
          <BaseButton :disabled="eligibility !== 'ready'" aria-describedby="reservation-confirmation-help"
            class="w-full sm:w-auto" @click="confirmReservation">Confirmar reserva</BaseButton>
          <p id="reservation-confirmation-help" class="text-helper text-muted">
            {{ confirmationHelp }}
          </p>
        </div>
      </template>
    </BaseCard>
  </div>
</template>
