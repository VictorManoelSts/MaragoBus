<script setup lang="ts">
import { computed } from 'vue'
import { UserRound } from '@lucide/vue'
import { BaseBadge, BaseCard, MockSessionControls } from '@maragobus/shared'
import { mockAuthAvailable } from '@maragobus/shared/auth/service'
import { useSessionStore } from '@maragobus/shared/auth/session'

const session = useSessionStore()
const driver = computed(() => session.authenticated && session.user?.role === 'driver' ? session.user : null)
const fields = computed(() => [
  { label: 'Nome completo', value: driver.value?.name },
  { label: 'CPF' },
  { label: 'E-mail' },
  { label: 'Telefone' },
])
</script>

<template>
  <div v-if="driver" class="space-y-8">
    <h1 class="text-page">Perfil do motorista</h1>

    <BaseCard>
      <template #header>
        <div class="flex min-w-0 items-center gap-3">
          <div class="grid size-12 shrink-0 place-items-center rounded-full bg-app text-identity">
            <UserRound :size="24" aria-hidden="true" />
          </div>
          <div class="min-w-0 space-y-1">
            <h2 class="text-section wrap-anywhere">{{ driver.name }}</h2>
            <BaseBadge>Motorista</BaseBadge>
          </div>
        </div>
      </template>
      <h3 class="mb-4 text-subtitle">Dados pessoais</h3>
      <dl class="grid min-w-0 gap-5 sm:grid-cols-2">
        <div v-for="field in fields" :key="field.label" class="min-w-0 space-y-1">
          <dt class="text-helper text-muted">{{ field.label }}</dt>
          <dd class="text-body wrap-anywhere">{{ field.value ?? 'Não informado' }}</dd>
        </div>
      </dl>
      <template #footer>
        <p class="text-body text-muted">Solicite alterações cadastrais à administração.</p>
      </template>
    </BaseCard>

    <MockSessionControls v-if="mockAuthAvailable" />
  </div>
</template>
