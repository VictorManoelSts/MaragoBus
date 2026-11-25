<script setup lang="ts">
import { BaseAlert, BaseBadge, BaseButton, BaseModal, BrandLogo } from '@maragobus/shared'
import { useSessionStore } from '@maragobus/shared/auth/session'
import type { StudentReservationSummary } from '../types/student-home'

defineProps<{ reservation?: StudentReservationSummary }>()
const emit = defineEmits<{ close: [] }>()
const session = useSessionStore()
const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' })
</script>

<template>
  <BaseModal :model-value="Boolean(reservation)" title="Comprovante de reserva" @update:model-value="emit('close')">
    <div v-if="reservation" class="space-y-5">
      <BrandLogo class="w-44 max-w-full" />
      <BaseAlert variant="warning">Comprovante demonstrativo — sem validade para embarque</BaseAlert>
      <dl class="grid min-w-0 gap-4 sm:grid-cols-2">
        <div v-if="session.user?.name.trim()">
          <dt class="text-helper text-muted">Aluno</dt>
          <dd>{{ session.user.name }}</dd>
        </div>
        <div>
          <dt class="text-helper text-muted">Data da viagem</dt>
          <dd><time :datetime="reservation.travelDate">{{ dateFormat.format(new Date(`${reservation.travelDate}T00:00:00Z`)) }}</time></dd>
        </div>
        <div>
          <dt class="text-helper text-muted">Faculdade</dt>
          <dd>{{ reservation.college }}</dd>
        </div>
        <div>
          <dt class="text-helper text-muted">Ponto de embarque</dt>
          <dd>{{ reservation.boardingPoint }}</dd>
        </div>
        <div class="sm:col-span-2">
          <dt class="text-helper text-muted">Identificador da reserva</dt>
          <dd class="break-all">{{ reservation.id }}</dd>
        </div>
        <div>
          <dt class="text-helper text-muted">Status</dt>
          <dd><BaseBadge>Confirmada</BaseBadge></dd>
        </div>
      </dl>
    </div>
    <template #footer>
      <BaseButton variant="outline" @click="emit('close')">Fechar</BaseButton>
    </template>
  </BaseModal>
</template>
