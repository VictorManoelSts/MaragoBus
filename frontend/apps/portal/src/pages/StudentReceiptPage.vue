<script setup lang="ts">
import { computed } from 'vue'
import { CalendarDays, GraduationCap, MapPin, UserRound } from '@lucide/vue'
import { BaseAlert, BaseBadge, BaseCard, BrandLogo } from '@maragobus/shared'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { useTransportClock } from '../composables/useTransportClock'
import { useReservationsStore } from '../stores/reservations'
import { formatCivilDate } from '../utils/format-transport-date'
import { getTransportDate } from '../utils/reservation-availability'

const session = useSessionStore()
const store = useReservationsStore()
const { reference } = useTransportClock()
const today = computed(() => getTransportDate(reference.value))
const state = computed(() => {
  const { currentReservation, futureReservation } = store.getHomeSummary(today.value)
  if (currentReservation?.status === 'confirmed') {
    return { kind: 'available', reservation: currentReservation } as const
  }
  if (currentReservation) return { kind: 'cancelled', date: currentReservation.travelDate } as const
  if (futureReservation) return { kind: 'future', date: futureReservation.travelDate } as const

  const cancelled = store.studentReservations.reduce<string | undefined>((earliest, item) => {
    if (item.status === 'cancelled' && item.travelDate > today.value && (!earliest || item.travelDate < earliest)) {
      return item.travelDate
    }
    return earliest
  }, undefined)
  return cancelled ? { kind: 'cancelled', date: cancelled } as const : { kind: 'empty' } as const
})
</script>

<template>
  <BaseCard class="mx-auto w-full max-w-md">
    <header class="mb-4 flex flex-col items-center gap-2 text-center">
      <BrandLogo class="w-36" />
      <h1 class="text-page">Comprovante</h1>
      <BaseBadge v-if="state.kind === 'available' || state.kind === 'future'" variant="success">Reserva confirmada</BaseBadge>
      <BaseBadge v-else-if="state.kind === 'cancelled'" variant="danger">Reserva cancelada</BaseBadge>
    </header>

    <div v-if="state.kind === 'available'" class="min-w-0 space-y-4">
      <div class="flex items-center justify-center gap-3 border-y border-line py-3">
        <CalendarDays :size="22" class="shrink-0 text-identity" aria-hidden="true" />
        <div>
          <p class="text-helper text-muted">Data da viagem</p>
          <time :datetime="state.reservation.travelDate" class="text-subtitle">{{ formatCivilDate(state.reservation.travelDate) }}</time>
        </div>
      </div>

      <dl class="grid gap-2 text-helper">
        <div v-if="session.user?.name.trim()" class="flex items-start gap-2">
          <UserRound :size="18" class="shrink-0 text-identity" aria-hidden="true" />
          <div class="min-w-0"><dt class="text-muted">Aluno</dt><dd class="wrap-break-word">{{ session.user.name }}</dd></div>
        </div>
        <div class="flex items-start gap-2">
          <GraduationCap :size="18" class="shrink-0 text-identity" aria-hidden="true" />
          <div class="min-w-0"><dt class="text-muted">Faculdade</dt><dd class="wrap-break-word">{{ state.reservation.college }}</dd></div>
        </div>
        <div class="flex items-start gap-2">
          <MapPin :size="18" class="shrink-0 text-identity" aria-hidden="true" />
          <div class="min-w-0"><dt class="text-muted">Ponto de embarque</dt><dd class="wrap-break-word">{{ state.reservation.boardingPoint }}</dd></div>
        </div>
      </dl>

      <BaseAlert variant="warning">Comprovante demonstrativo — sem validade para embarque</BaseAlert>
    </div>

    <BaseAlert v-else-if="state.kind === 'future'" variant="info">
      O comprovante estará disponível em <time :datetime="state.date">{{ formatCivilDate(state.date) }}</time> às 00h (horário de Alagoas).
    </BaseAlert>
    <BaseAlert v-else-if="state.kind === 'cancelled'" variant="warning">
      A reserva de <time :datetime="state.date">{{ formatCivilDate(state.date) }}</time> foi cancelada. O comprovante está indisponível.
    </BaseAlert>
    <BaseAlert v-else variant="info"><p>Você não tem reservas para hoje ou para os próximos dias.</p></BaseAlert>
  </BaseCard>
</template>
