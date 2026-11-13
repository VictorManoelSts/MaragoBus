<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { X } from '@lucide/vue'
import BaseButton from './BaseButton.vue'
import { lockModalScroll } from '../utils/modal-scroll'

const props = defineProps<{ modelValue: boolean; title: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const dialog = ref<HTMLDialogElement>()
const titleId = 'mb-modal-title-' + useId()
let previousFocus: HTMLElement | null = null
let releaseScroll: (() => void) | undefined

function restore() {
  releaseScroll?.()
  releaseScroll = undefined
  if (previousFocus?.isConnected) previousFocus.focus()
  previousFocus = null
}
function sync() {
  const element = dialog.value
  if (!element) return
  if (props.modelValue && !element.open) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    element.showModal()
    releaseScroll = lockModalScroll()
    element.querySelector<HTMLButtonElement>('[data-modal-close]')?.focus()
  } else if (!props.modelValue && element.open) {
    element.close()
    restore()
  }
}
function requestClose() {
  emit('update:modelValue', false)
}
function onNativeClose() {
  // Ignora um evento close atrasado de um ciclo anterior de abertura.
  if (dialog.value?.open) return
  restore()
  if (props.modelValue) requestClose()
}
function visible(element: HTMLElement) {
  for (let node: HTMLElement | null = element; node && node !== dialog.value; node = node.parentElement) {
    const style = getComputedStyle(node)
    if (node.hidden || node.inert || style.display === 'none' || style.visibility === 'hidden') return false
  }
  return true
}
function trapTab(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !dialog.value?.open) return
  const elements = [...dialog.value.querySelectorAll<HTMLElement>(
    'a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]',
  )].filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && visible(element))
  const first = elements[0]
  const last = elements.at(-1)
  if (!first || !last) return
  const active = document.activeElement
  if (event.shiftKey && (active === first || !dialog.value.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (active === last || !dialog.value.contains(active))) {
    event.preventDefault()
    first.focus()
  }
}
watch(() => props.modelValue, sync, { flush: 'post' })
onMounted(sync)
onBeforeUnmount(() => {
  if (dialog.value?.open) dialog.value.close()
  restore()
})
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="mb-modal"
      aria-modal="true"
      :aria-labelledby="titleId"
      @cancel.prevent="requestClose"
      @close="onNativeClose"
      @keydown="trapTab"
    >
      <header class="mb-modal__header">
        <h2 :id="titleId" class="mb-modal__title">{{ title }}</h2>
        <BaseButton
          variant="ghost" size="sm" class="mb-modal__close" aria-label="Fechar modal"
          data-modal-close @click="requestClose"
        >
          <X :size="20" aria-hidden="true" />
        </BaseButton>
      </header>
      <div class="mb-modal__body"><slot /></div>
      <footer v-if="$slots.footer" class="mb-modal__footer"><slot name="footer" /></footer>
    </dialog>
  </Teleport>
</template>
