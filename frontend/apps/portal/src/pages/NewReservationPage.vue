<script setup lang="ts">
import { computed, ref } from 'vue'
import { BaseAlert, BaseButton, BaseCard, BaseSelect } from '@maragobus/shared'
import { getMockReservationForm } from '../mocks/reservation-form'
import type { ReservationFormContext } from '../types/reservation-form'

const props = withDefaults(defineProps<{ context?: ReservationFormContext }>(), {
  context: getMockReservationForm,
})
// Apenas uma escolha local. Não grava perfil, sessão ou reservas.
const selectedPointId = ref(props.context.boardingPoints.some(point =>
  point.id === props.context.defaultBoardingPointId) ? props.context.defaultBoardingPointId! : '')
const options = computed(() => props.context.boardingPoints.map(point => ({ value: point.id, label: point.name })))
const selectedPoint = computed(() => props.context.boardingPoints.find(point => point.id === selectedPointId.value))
const formattedDate = computed(() => {
  // A data é civil; UTC evita deslocamento ao dia anterior no fuso local.
  const date = new Date(`${props.context.travelDate}T00:00:00Z`)
  const label = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
})
const collegeLabel = computed(() => props.context.college?.trim() || 'Faculdade não informada neste modelo de demonstração.')
</script>

<template>
  <div class="min-w-0 space-y-8">
    <div class="space-y-3">
      <h1 class="text-page">Fazer reserva</h1>
      <p class="max-w-prose text-body text-muted">Confira as informações da viagem e selecione seu ponto de embarque.</p>
    </div>

    <BaseAlert variant="info">
      Dados de demonstração: a data e os pontos de embarque são exemplos de desenvolvimento.
      Não representam disponibilidade de viagem nem pontos reais cadastrados no sistema.
    </BaseAlert>

    <BaseCard>
      <div class="space-y-6">
        <dl class="grid min-w-0 gap-5 sm:grid-cols-2">
          <div class="min-w-0 space-y-1">
            <dt class="text-helper text-muted">Data da viagem (demonstração)</dt>
            <dd class="text-body"><time :datetime="context.travelDate">{{ formattedDate }}</time></dd>
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
              <dd>{{ formattedDate }}</dd>
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
          <BaseButton disabled aria-describedby="reservation-confirmation-help" class="w-full sm:w-auto">Confirmar reserva</BaseButton>
          <p id="reservation-confirmation-help" class="text-helper text-muted">
            A confirmação de reservas ainda não está disponível. Nenhuma reserva será criada nesta demonstração.
          </p>
        </div>
      </template>
    </BaseCard>
  </div>
</template>
