<script setup lang="ts">
import type { BadgeVariant } from '../types/design-system'
withDefaults(defineProps<{ variant?: BadgeVariant; size?: 'sm' | 'md' }>(), { variant: 'neutral', size: 'md' })
</script>

<template>
  <span class="mb-badge" :class="['mb-feedback--' + variant, 'mb-badge--' + size]"><slot /></span>
</template>
