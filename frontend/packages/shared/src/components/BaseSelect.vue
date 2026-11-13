<script setup lang="ts">
import { computed, useAttrs, useId } from 'vue'
import type { SelectHTMLAttributes } from 'vue'
import { ChevronDown, CircleAlert } from '@lucide/vue'
import type { SelectOption, SelectValue } from '../types/design-system'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  id?: string
  label: string
  options: readonly SelectOption[]
  placeholder?: string
  help?: string
  error?: string
  disabled?: boolean
}>(), { placeholder: 'Selecione uma opção', disabled: false })
const model = defineModel<SelectValue>({ default: '' })
const attrs = useAttrs() as SelectHTMLAttributes
const generatedId = useId()
const fieldId = computed(() => props.id ?? 'mb-select-' + generatedId)
function describedBy() {
  return [attrs['aria-describedby'], props.help && fieldId.value + '-help', props.error && fieldId.value + '-error']
    .filter(Boolean).join(' ') || undefined
}
</script>

<template>
  <div class="mb-field">
    <label :for="fieldId" class="mb-label">{{ label }}</label>
    <div class="mb-select-wrap">
      <select
        v-bind="attrs"
        :id="fieldId"
        v-model="model"
        :disabled="disabled"
        :aria-invalid="error ? 'true' : attrs['aria-invalid']"
        :aria-describedby="describedBy()"
        class="mb-control mb-select"
      >
        <option disabled value="">{{ placeholder }}</option>
        <option v-for="option in options" :key="typeof option.value + ':' + option.value" :value="option.value" :disabled="option.disabled">
          {{ option.label }}
        </option>
      </select>
      <ChevronDown class="mb-select-icon" :size="18" aria-hidden="true" />
    </div>
    <p v-if="help" :id="fieldId + '-help'" class="mb-help">{{ help }}</p>
    <p v-if="error" :id="fieldId + '-error'" class="mb-error" role="alert">
      <CircleAlert :size="16" aria-hidden="true" />
      <span>{{ error }}</span>
    </p>
  </div>
</template>
