<script setup lang="ts">
import { BrandLogo } from '@maragobus/shared'
</script>

<template>
  <div class="portal-layout flex min-h-svh w-full min-w-0 flex-col bg-app text-content">
    <a
      href="#portal-content"
      class="sr-only rounded-control bg-surface px-4 py-3 text-label shadow-card focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-50"
    >
      Ir para o conteúdo principal
    </a>

    <header class="border-t-2 border-t-accent border-b border-line bg-surface">
      <div class="flex w-full items-center px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <BrandLogo class="w-44 sm:w-52" />
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
        class="min-w-0 flex-1 px-4 py-8 wrap-anywhere sm:px-6 sm:py-10 lg:px-8 lg:py-12"
      >
        <slot />
      </main>
    </div>

    <div v-if="$slots['mobile-navigation']" class="sticky bottom-0 z-20 lg:hidden">
      <slot name="mobile-navigation" />
    </div>
  </div>
</template>
