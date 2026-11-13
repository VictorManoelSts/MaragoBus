<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { CalendarDays } from '@lucide/vue'
import { BaseAlert, BaseBadge, BaseCard } from '@maragobus/shared'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { studentNavigationItems } from '../router/student-navigation'
import { getMockStudentHome } from '../mocks/student-home'
import type { StudentHomeSummary } from '../types/student-home'

const props = withDefaults(defineProps<{ summary?: StudentHomeSummary }>(), {
  summary: getMockStudentHome,
})
const session = useSessionStore()
const studentName = computed(() => session.user?.name.trim().split(/\s+/)[0])
const quickLinks = studentNavigationItems.filter(item =>
  ['new-reservation', 'reservations', 'announcements'].includes(item.name))
const statusLabels = { confirmed: 'Confirmada', cancelled: 'Cancelada' } as const
function formatTravelDate(date: string) {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}
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
              {{ formatTravelDate(summary.currentReservation.travelDate) }}
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
          <RouterLink to="/reservas" class="mb-button mb-button--outline mb-button--md w-full sm:w-auto">Ver minha reserva</RouterLink>
        </div>
        <div v-else class="space-y-5">
          <p class="text-body text-muted">Você não tem uma reserva atual para apresentar.</p>
          <RouterLink to="/reservar" class="mb-button mb-button--primary mb-button--md w-full sm:w-auto">Fazer reserva</RouterLink>
        </div>
      </BaseCard>
      <BaseAlert v-if="summary.futureReservation?.status === 'confirmed'" variant="info">
        Sua reserva para o próximo dia de viagem está confirmada.
      </BaseAlert>
    </section>

    <nav aria-labelledby="quick-links-title" class="space-y-3">
      <h2 id="quick-links-title" class="text-subtitle">Acessos rápidos</h2>
      <ul class="grid gap-2 sm:grid-cols-3">
        <li v-for="item in quickLinks" :key="item.name" class="min-w-0">
          <RouterLink :to="item.path" class="mb-button mb-button--ghost mb-button--md w-full justify-start gap-3">
            <component :is="item.icon" :size="20" class="shrink-0" aria-hidden="true" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </li>
      </ul>
      <p class="text-helper text-muted">Em Notificações, você encontra os avisos administrativos.</p>
    </nav>
  </div>
</template>
