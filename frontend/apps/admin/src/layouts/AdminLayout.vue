<script setup lang="ts">
import { BaseBadge, BrandLogo } from '@maragobus/shared'

defineProps<{ title?: string }>()
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
      <div class="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        <BrandLogo class="w-36 min-w-0 sm:w-44" />
        <div v-if="$slots['header-actions']" class="ml-auto lg:hidden"><slot name="header-actions" /></div>
        <div class="order-last w-full min-w-0 lg:order-none lg:w-auto lg:border-l lg:border-line lg:pl-6">
          <BaseBadge size="sm">Área administrativa</BaseBadge>
          <h1 v-if="title" id="admin-page-title" class="mt-1 text-section wrap-anywhere">{{ title }}</h1>
        </div>
      </div>
    </header>

    <div class="flex w-full min-w-0 flex-1" :class="$slots['desktop-navigation'] ? 'lg:min-h-0' : undefined">
      <div v-if="$slots['desktop-navigation']" class="hidden shrink-0 lg:block lg:min-h-0">
        <slot name="desktop-navigation" />
      </div>

      <main
        id="admin-content"
        tabindex="-1"
        :aria-labelledby="title ? 'admin-page-title' : undefined"
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
