<script setup lang="ts">
import { BaseCard, MockSessionControls } from '@maragobus/shared'
import { mockAuthAvailable } from '@maragobus/shared/auth/service'

withDefaults(defineProps<{ title: string; description: string; message?: string; showLogout?: boolean }>(), {
  message: 'Esta funcionalidade será implementada posteriormente.',
})
</script>

<template>
  <div class="space-y-8">
    <div class="space-y-3">
      <h1 class="text-page">{{ title }}</h1>
      <p class="max-w-prose text-body text-muted">{{ description }}</p>
    </div>
    <BaseCard>
      <p class="text-body text-muted">{{ message }}</p>
    </BaseCard>
    <MockSessionControls v-if="showLogout && mockAuthAvailable" />
  </div>
</template>
