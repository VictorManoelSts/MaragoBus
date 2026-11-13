<script setup lang="ts">
import { BaseCard, MockSessionControls } from '@maragobus/shared'
import { mockAuthAvailable } from '@maragobus/shared/auth/service'

defineProps<{ title: string; description: string; showLogout?: boolean }>()
</script>

<template>
  <div class="space-y-8">
    <div class="space-y-3">
      <h1 class="text-page">{{ title }}</h1>
      <p class="max-w-prose text-body text-muted">{{ description }}</p>
    </div>
    <BaseCard>
      <p class="text-body text-muted">Esta funcionalidade administrativa será desenvolvida posteriormente.</p>
    </BaseCard>
    <MockSessionControls v-if="showLogout && mockAuthAvailable" />
  </div>
</template>
