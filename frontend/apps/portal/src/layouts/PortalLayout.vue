<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { BrandLogo } from '@maragobus/shared'
import PortalThemeSwitch from '../components/PortalThemeSwitch.vue'

const mobileNavigation = ref<HTMLElement>()
let observer: ResizeObserver | undefined
let focusFrame: number | undefined
const scrollInset = '--portal-mobile-scroll-inset'

function updateScrollInset() {
  const nav = mobileNavigation.value
  const height = nav && getComputedStyle(nav).position === 'sticky' ? nav.offsetHeight : 0
  document.documentElement.style.setProperty(scrollInset, `${height}px`)
}

function keepFocusVisible(event: FocusEvent) {
  const target = event.target
  if (!(target instanceof HTMLElement) || target === event.currentTarget) return
  if (focusFrame !== undefined) cancelAnimationFrame(focusFrame)
  focusFrame = requestAnimationFrame(() => {
    focusFrame = undefined
    const nav = mobileNavigation.value
    if (document.activeElement !== target || !nav?.offsetHeight || getComputedStyle(nav).position !== 'sticky') return
    const viewportBottom = document.documentElement.clientHeight
    const navTop = nav.getBoundingClientRect().top
    const { top, bottom } = target.getBoundingClientRect()
    if (navTop >= viewportBottom || bottom <= navTop || top >= viewportBottom) return
    const scroll = Math.min(bottom - navTop + 8, top)
    if (scroll > 0) window.scrollBy({ top: scroll, behavior: 'instant' })
  })
}

onMounted(() => {
  const nav = mobileNavigation.value
  if (!nav) return
  updateScrollInset()
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(updateScrollInset)
    observer.observe(nav)
  }
  window.addEventListener('resize', updateScrollInset)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', updateScrollInset)
  if (focusFrame !== undefined) cancelAnimationFrame(focusFrame)
  if (mobileNavigation.value) document.documentElement.style.removeProperty(scrollInset)
})
</script>

<template>
  <div class="portal-layout flex min-h-svh w-full min-w-0 flex-col bg-app text-content">
    <a
      href="#portal-content"
      class="sr-only rounded-control bg-surface px-4 py-3 text-label shadow-card focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-50"
    >
      Ir para o conteúdo principal
    </a>

    <header class="border-b border-line bg-surface">
      <div class="flex w-full flex-wrap items-center gap-2 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <BrandLogo
          class="w-44 min-w-0 flex-[0_1_auto] sm:w-52"
        />
        <slot name="header-controls">
          <PortalThemeSwitch class="ml-auto" />
        </slot>
      </div>
    </header>

    <div class="flex w-full min-w-0 flex-1">
      <!-- Regiões opcionais: o layout não depende de um perfil específico. -->
      <div v-if="$slots['desktop-navigation']" class="hidden shrink-0 lg:block">
        <slot name="desktop-navigation" />
      </div>

      <main
        id="portal-content"
        tabindex="-1"
        @focusin="keepFocusVisible"
        class="min-w-0 flex-1 px-4 py-8 wrap-anywhere sm:px-6 sm:py-10 lg:px-8 lg:py-12"
      >
        <slot />
      </main>
    </div>

    <div v-if="$slots['mobile-navigation']" ref="mobileNavigation"
      class="sticky bottom-0 z-20 lg:hidden [@media(max-height:24rem)]:static">
      <slot name="mobile-navigation" />
    </div>
  </div>
</template>
