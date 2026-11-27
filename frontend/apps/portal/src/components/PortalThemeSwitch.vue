<script setup lang="ts">
import { computed } from 'vue'
import { Moon, Sun } from '@lucide/vue'
import { useTheme } from '@maragobus/shared/theme'

const { preference, setPreference } = useTheme()
const dark = computed(() => preference.value === 'dark')
</script>

<template>
  <button
    type="button" role="switch" aria-label="Tema escuro" :aria-checked="dark"
    class="grid h-11 w-[4.5rem] shrink-0 cursor-pointer place-items-center rounded-full"
    @click="setPreference(dark ? 'light' : 'dark')"
  >
    <span aria-hidden="true" class="relative grid h-8 w-full grid-cols-2 place-items-center rounded-full bg-secondary ring-1 ring-inset ring-control-border">
      <span
        class="absolute inset-y-1 left-[3px] w-8 rounded-full bg-identity transition-transform duration-150 motion-reduce:transition-none"
        :class="{ 'translate-x-9': dark }"
      />
      <Sun :size="16" class="relative" :class="dark ? 'text-muted' : 'text-on-primary'" />
      <Moon :size="16" class="relative" :class="dark ? 'text-on-primary' : 'text-muted'" />
    </span>
  </button>
</template>
