<script setup lang="ts">
import { BaseBadge, BrandLogo } from '@maragobus/shared'
</script>

<template>
  <div
    class="admin-layout flex min-h-svh min-w-0 flex-col bg-app text-content"
    :class="$slots['desktop-navigation'] ? 'lg:h-svh lg:overflow-hidden' : undefined"
  >
    <a
      href="#admin-content"
      class="sr-only rounded-control bg-surface px-4 py-3 text-label shadow-card focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-50"
    >
      Ir para o conteúdo principal
    </a>

    <header class="shrink-0 border-t-2 border-t-accent border-b border-line bg-surface">
      <div class="flex w-full flex-wrap items-center gap-3 px-4 py-4 sm:gap-6 sm:px-6 sm:py-5 lg:px-8">
        <BrandLogo class="w-44 sm:w-52" />
        <div class="order-3 w-full sm:order-none sm:w-auto"><BaseBadge size="sm">Área administrativa</BaseBadge></div>
        <div v-if="$slots['header-actions']" class="ml-auto lg:hidden"><slot name="header-actions" /></div>
      </div>
    </header>

    <div class="flex w-full min-w-0 flex-1" :class="$slots['desktop-navigation'] ? 'lg:min-h-0' : undefined">
      <div v-if="$slots['desktop-navigation']" class="hidden shrink-0 lg:block lg:min-h-0">
        <slot name="desktop-navigation" />
      </div>

      <main
        id="admin-content"
        tabindex="-1"
        class="min-w-0 flex-1 px-4 py-8 wrap-anywhere sm:px-6 sm:py-10 lg:px-8 lg:py-12"
        :class="$slots['desktop-navigation'] ? 'lg:min-h-0 lg:overflow-y-auto' : undefined"
      >
        <slot />
      </main>
    </div>

    <div v-if="$slots['mobile-navigation']" class="lg:hidden">
      <slot name="mobile-navigation" />
    </div>
  </div>
</template>
