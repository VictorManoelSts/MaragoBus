<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { PortalNavigationItem } from '../types/navigation'

withDefaults(defineProps<{
  items: readonly PortalNavigationItem[]
  label: string
  variant?: 'desktop' | 'mobile'
}>(), { variant: 'desktop' })
</script>

<template>
  <nav
    :aria-label="label"
    class="bg-surface"
    :class="variant === 'desktop'
      ? 'h-full w-64 border-r border-line px-3 py-8'
      : 'portal-navigation--mobile border-t border-line px-1 pt-1'"
  >
    <ul
      :class="variant === 'desktop' ? 'space-y-2' : 'grid gap-1'"
      :style="variant === 'mobile' ? { gridTemplateColumns: 'repeat(' + items.length + ', minmax(0, 1fr))' } : undefined"
    >
      <li v-for="item in items" :key="item.name" class="min-w-0">
        <RouterLink
          :to="{ name: item.name }"
          class="portal-navigation__link flex rounded-control"
          :class="variant === 'desktop'
            ? 'items-center gap-3 px-3 py-3 text-label'
            : 'min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-center text-xs sm:text-helper'"
        >
          <component :is="item.icon" :size="20" class="shrink-0" aria-hidden="true" />
          <span class="wrap-anywhere">{{ item.label }}</span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
