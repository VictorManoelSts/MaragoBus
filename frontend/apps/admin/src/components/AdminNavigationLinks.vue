<script setup lang="ts">
import { useId } from 'vue'
import { RouterLink } from 'vue-router'
import { adminNavigationGroups } from '../router/admin-navigation'

const id = useId()
const emit = defineEmits<{ select: [] }>()
function select(event: MouseEvent) {
  // Mantém o comportamento nativo de abrir links em outra aba/janela.
  if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) emit('select')
}
</script>

<template>
  <div class="space-y-6">
    <section v-for="group in adminNavigationGroups" :key="group.name" :aria-labelledby="id + '-' + group.name">
      <h3 :id="id + '-' + group.name" class="px-3 pb-2 text-caption text-muted">{{ group.label }}</h3>
      <ul class="space-y-1">
    <li v-for="item in group.items" :key="item.name">
      <RouterLink
        :to="{ name: item.name }"
        class="admin-sidebar__link flex items-center gap-3 rounded-control px-3 py-3 text-label"
        @click="select"
      >
        <component :is="item.icon" :size="20" class="shrink-0" aria-hidden="true" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </li>
      </ul>
    </section>
  </div>
</template>
