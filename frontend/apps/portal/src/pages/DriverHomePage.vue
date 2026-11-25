<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { BaseBadge, BaseCard } from '@maragobus/shared'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { driverFeatures } from '../router/driver-navigation'

const session = useSessionStore()
const driverName = computed(() => session.user?.name.trim())
</script>

<template>
  <div class="space-y-8">
    <header class="space-y-3">
      <h1 class="text-page">Painel do motorista</h1>
      <p class="wrap-anywhere text-body text-muted">{{ driverName ? `Olá, ${driverName}!` : 'Olá!' }}</p>
    </header>

    <section aria-labelledby="driver-features-title" class="space-y-4">
      <h2 id="driver-features-title" class="text-section">Serviços do motorista</h2>
      <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <li v-for="feature in driverFeatures" :key="feature.name" class="min-w-0">
          <BaseCard class="h-full">
            <template #header>
              <div class="flex items-start gap-3">
                <component :is="feature.icon" :size="20" class="mt-1 shrink-0 text-identity" aria-hidden="true" />
                <h3 class="text-subtitle">{{ feature.action }}</h3>
              </div>
            </template>
            <div class="space-y-3">
              <BaseBadge>{{ feature.linkLabel ? 'Disponível' : 'Em desenvolvimento' }}</BaseBadge>
              <p class="text-helper text-muted">{{ feature.availability }}</p>
            </div>
            <template #footer>
              <RouterLink
                :to="{ name: feature.name }"
                :aria-label="feature.linkLabel ?? `Ver informações sobre ${feature.title.toLowerCase()}`"
                class="mb-button mb-button--outline mb-button--md"
              >
                {{ feature.linkLabel ?? 'Ver informações' }}
              </RouterLink>
            </template>
          </BaseCard>
        </li>
      </ul>
    </section>
  </div>
</template>
