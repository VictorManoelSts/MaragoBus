<script setup lang="ts">
import { CircleCheck, TriangleAlert, CircleX, Info } from '@lucide/vue'
import type { ButtonIcon, FeedbackVariant } from '../types/design-system'

withDefaults(defineProps<{
  variant?: FeedbackVariant
  title?: string
  showIcon?: boolean
  role?: 'status' | 'alert'
}>(), { variant: 'info', showIcon: true })
const icons: Record<FeedbackVariant, ButtonIcon> = {
  success: CircleCheck, warning: TriangleAlert, danger: CircleX, info: Info,
}
</script>

<template>
  <div class="mb-alert" :class="'mb-feedback--' + variant" :role="role ?? (variant === 'danger' ? 'alert' : 'status')">
    <component :is="icons[variant]" v-if="showIcon" class="mb-alert__icon" :size="20" aria-hidden="true" />
    <div class="mb-alert__body">
      <p v-if="title" class="mb-alert__title">{{ title }}</p>
      <slot />
    </div>
  </div>
</template>
