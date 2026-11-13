<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Menu, X } from '@lucide/vue'
import { BaseButton } from '@maragobus/shared'
import AdminNavigationLinks from './AdminNavigationLinks.vue'

const route = useRoute()
const open = ref(false)
const dialog = ref<HTMLDialogElement>()
const id = 'admin-menu-' + useId()
// Mesmo lg (64rem) utilizado pelas classes da sidebar e do botão.
const desktopQuery = '(min-width: 64rem)'
let media: MediaQueryList | undefined
let opener: HTMLButtonElement | null = null
let previousOverflow: { body: string; html: string } | undefined
let pointerStartedOutside = false

function unlockScroll() {
  if (!previousOverflow) return
  document.body.style.overflow = previousOverflow.body
  document.documentElement.style.overflow = previousOverflow.html
  previousOverflow = undefined
}
function close(reason: 'dismiss' | 'navigate' | 'desktop' | 'unmount' = 'dismiss') {
  if (!open.value) return
  open.value = false
  pointerStartedOutside = false
  if (dialog.value?.open) dialog.value.close()
  unlockScroll()
  if (reason === 'navigate' || reason === 'desktop') {
    void nextTick(() => document.getElementById('admin-content')?.focus({ preventScroll: true }))
  } else if (reason !== 'unmount' && opener?.isConnected) {
    opener.focus({ preventScroll: true })
  }
}
function show(event: MouseEvent) {
  if (media?.matches || open.value || !dialog.value) return
  opener = event.currentTarget as HTMLButtonElement
  opener.focus({ preventScroll: true })
  dialog.value.showModal()
  previousOverflow = { body: document.body.style.overflow, html: document.documentElement.style.overflow }
  document.body.style.overflow = 'hidden'
  document.documentElement.style.overflow = 'hidden'
  open.value = true
  dialog.value.querySelector<HTMLButtonElement>('[data-menu-close]')?.focus()
  dialog.value.querySelector<HTMLAnchorElement>('a[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest' })
}
function outside(event: MouseEvent | PointerEvent) {
  if (event.target !== dialog.value || !dialog.value) return false
  const rect = dialog.value.getBoundingClientRect()
  return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom
}
function backdrop(event: MouseEvent) {
  if (pointerStartedOutside && outside(event)) close()
  pointerStartedOutside = false
}
function trapTab(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !open.value || !dialog.value) return
  const controls = [...dialog.value.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')]
    .filter(element => element.tabIndex >= 0)
  const first = controls[0]
  const last = controls.at(-1)
  if (!first || !last) return
  if (event.shiftKey && (document.activeElement === first || !dialog.value.contains(document.activeElement))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (document.activeElement === last || !dialog.value.contains(document.activeElement))) {
    event.preventDefault()
    first.focus()
  }
}
function breakpointChanged() {
  if (media?.matches) close('desktop')
}
function nativeClose() {
  if (!dialog.value?.open) close()
}
watch(() => route.fullPath, () => close('navigate'), { flush: 'post' })
onMounted(() => {
  if (typeof window.matchMedia === 'function') {
    media = window.matchMedia(desktopQuery)
    media.addEventListener('change', breakpointChanged)
  }
})
onBeforeUnmount(() => {
  media?.removeEventListener('change', breakpointChanged)
  close('unmount')
})
</script>

<template>
  <BaseButton
    variant="ghost" size="sm" class="min-w-11 lg:hidden" aria-label="Abrir menu"
    :aria-expanded="open" :aria-controls="id" aria-haspopup="dialog" @click="show"
  >
    <Menu :size="20" aria-hidden="true" />
  </BaseButton>

  <Teleport to="body">
    <dialog
      :id="id" ref="dialog" class="admin-drawer" aria-modal="true" :aria-labelledby="id + '-title'"
      @cancel.prevent="close()" @close="nativeClose" @keydown="trapTab"
      @pointerdown="pointerStartedOutside = outside($event)" @click="backdrop"
    >
      <div class="admin-drawer__header flex shrink-0 items-center justify-between gap-3 border-b border-line">
        <h2 :id="id + '-title'" class="min-w-0 text-subtitle">Menu administrativo</h2>
        <BaseButton
          variant="ghost" size="sm" class="min-w-11 shrink-0" aria-label="Fechar menu"
          data-menu-close @click="close()"
        >
          <X :size="20" aria-hidden="true" />
        </BaseButton>
      </div>
      <nav aria-label="Navegação administrativa" class="admin-drawer__navigation min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <AdminNavigationLinks @select="close('navigate')" />
      </nav>
    </dialog>
  </Teleport>
</template>
