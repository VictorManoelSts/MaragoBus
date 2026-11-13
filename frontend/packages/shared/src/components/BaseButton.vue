<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import type { ButtonIcon, ButtonVariant, ControlSize } from '../types/design-system'

withDefaults(defineProps<{
  variant?: ButtonVariant
  size?: ControlSize
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  icon?: ButtonIcon
}>(), { variant: 'primary', size: 'md', type: 'button', disabled: false, loading: false })

const emit = defineEmits<{ click: [event: MouseEvent] }>()
</script>

<template>
  <button
    :type="type"
    class="mb-button"
    :class="['mb-button--' + variant, 'mb-button--' + size]"
    :disabled="disabled || loading"
    :aria-busy="loading ? 'true' : undefined"
    @click="!disabled && !loading && emit('click', $event)"
  >
    <LoaderCircle v-if="loading" class="mb-spinner mb-button__icon" :size="18" aria-hidden="true" />
    <span v-else-if="icon || $slots.icon" class="mb-button__icon" aria-hidden="true">
      <slot name="icon"><component :is="icon" /></slot>
    </span>
    <span><slot /></span>
    <span v-if="loading" class="sr-only">Carregando</span>
  </button>
</template>
