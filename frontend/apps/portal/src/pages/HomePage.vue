<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { CalendarDays } from '@lucide/vue'
import { BaseAlert, BaseBadge, BaseButton, BaseCard } from '@maragobus/shared'
import { useSessionStore } from '@maragobus/shared/auth/session'
import ReservationReceiptModal from '../components/ReservationReceiptModal.vue'
import { useReservationReceipt } from '../composables/useReservationReceipt'
import { studentQuickLinks } from '../router/student-navigation'
import { useReservationsStore } from '../stores/reservations'
import { formatCivilDate } from '../utils/format-transport-date'
import { getTransportDate } from '../utils/reservation-availability'
import { getReceiptAvailability } from '../utils/reservation-receipt'

const session = useSessionStore()
const reservations = useReservationsStore()
const { reference, receipt, receiptUnavailable, openReceipt, closeReceipt } = useReservationReceipt()
const summary = computed(() => reservations.getHomeSummary(getTransportDate(reference.value)))
const studentName = computed(() => session.user?.name.trim().split(/\s+/)[0])

const statusLabels = { confirmed: 'Confirmada', cancelled: 'Cancelada' } as const
</script>

<template>
  <div class="space-y-8">
    <div class="space-y-3">
      <h1 class="text-page">{{ studentName ? `Olá, ${studentName}!` : 'Olá!' }}</h1>
      <p class="max-w-prose text-body text-muted">
        Acompanhe suas reservas de transporte universitário.
      </p>
    </div>
    <section aria-labelledby="current-reservation-title" class="space-y-4">
      <BaseCard>
        <template #header>
          <h2 id="current-reservation-title" class="text-section">Sua reserva atual</h2>
        </template>
        <div v-if="summary.currentReservation" class="space-y-6">
          <div class="flex flex-wrap items-center gap-3">
            <CalendarDays :size="20" class="text-identity" aria-hidden="true" />
            <time :datetime="summary.currentReservation.travelDate" class="text-subtitle">
              {{ formatCivilDate(summary.currentReservation.travelDate) }}
            </time>
            <BaseBadge :variant="summary.currentReservation.status === 'confirmed' ? 'neutral' : 'warning'">
              {{ statusLabels[summary.currentReservation.status] }}
            </BaseBadge>
          </div>
          <dl class="grid min-w-0 gap-5 sm:grid-cols-2">
            <div class="min-w-0 space-y-1">
              <dt class="text-helper text-muted">Faculdade de destino</dt>
              <dd class="text-body">{{ summary.currentReservation.college }}</dd>
            </div>
            <div class="min-w-0 space-y-1">
              <dt class="text-helper text-muted">Ponto de embarque</dt>
              <dd class="text-body">{{ summary.currentReservation.boardingPoint }}</dd>
            </div>
          </dl>
          <div class="flex flex-wrap gap-3">
            <BaseButton
              v-if="getReceiptAvailability(summary.currentReservation, reference) === 'available'"
              class="w-full sm:w-auto" @click="openReceipt(summary.currentReservation.id)"
            >
              Ver comprovante
            </BaseButton>
            <RouterLink to="/reservas" class="mb-button mb-button--outline mb-button--md w-full sm:w-auto">Ver minha reserva</RouterLink>
          </div>
        </div>
        <div v-else class="space-y-5">
          <p class="text-body text-muted">Você não tem uma reserva atual para apresentar.</p>
          <RouterLink to="/reservar" class="mb-button mb-button--primary mb-button--md w-full sm:w-auto">Fazer reserva</RouterLink>
        </div>
      </BaseCard>
      <BaseAlert v-if="receiptUnavailable" variant="info">O comprovante desta reserva está indisponível.</BaseAlert>
      <BaseAlert v-if="summary.futureReservation?.status === 'confirmed'" variant="info">
        <p>Sua reserva para o próximo dia de viagem está confirmada.</p>
        <p>O comprovante estará disponível a partir das 00h do dia da viagem (horário de Alagoas).</p>
      </BaseAlert>
    </section>

    <nav aria-labelledby="quick-links-title" class="space-y-3">
      <h2 id="quick-links-title" class="text-subtitle">Acessos rápidos</h2>
      <ul class="grid gap-2 sm:grid-cols-2">
        <li v-for="item in studentQuickLinks" :key="item.name" class="min-w-0">
          <RouterLink :to="item.path" class="mb-button mb-button--ghost mb-button--md w-full justify-start gap-3">
            <component :is="item.icon" :size="20" class="shrink-0" aria-hidden="true" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </li>
      </ul>
    </nav>
    <ReservationReceiptModal :reservation="receipt" @close="closeReceipt" />
  </div>
</template>
