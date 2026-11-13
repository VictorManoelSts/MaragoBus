<script setup lang="ts">
import { computed, useAttrs, useId } from 'vue'
import type { InputHTMLAttributes } from 'vue'
import { CircleAlert } from '@lucide/vue'
import type { InputType } from '../types/design-system'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  id?: string
  label: string
  type?: InputType
  placeholder?: string
  help?: string
  error?: string
  disabled?: boolean
}>(), { type: 'text', disabled: false })
const [model, modifiers] = defineModel<string | number, 'number' | 'trim'>({ default: '' })
const attrs = useAttrs() as InputHTMLAttributes
const generatedId = useId()
const fieldId = computed(() => props.id ?? 'mb-input-' + generatedId)
function describedBy() {
  return [attrs['aria-describedby'], props.help && fieldId.value + '-help', props.error && fieldId.value + '-error']
    .filter(Boolean).join(' ') || undefined
}
function update(event: Event) {
  let value: string | number = (event.target as HTMLInputElement).value
  if (modifiers.trim) value = value.trim()
  if (modifiers.number && value !== '') {
    const number = Number(value)
    if (!Number.isNaN(number)) value = number
  }
  model.value = value
}
</script>

<template>
  <div class="mb-field">
    <label :for="fieldId" class="mb-label">{{ label }}</label>
    <input
      v-bind="attrs"
      :id="fieldId"
      :value="model"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-invalid="error ? 'true' : attrs['aria-invalid']"
      :aria-describedby="describedBy()"
      class="mb-control"
      @input="update"
    />
    <p v-if="help" :id="fieldId + '-help'" class="mb-help">{{ help }}</p>
    <p v-if="error" :id="fieldId + '-error'" class="mb-error" role="alert">
      <CircleAlert :size="16" aria-hidden="true" />
      <span>{{ error }}</span>
    </p>
  </div>
</template>
