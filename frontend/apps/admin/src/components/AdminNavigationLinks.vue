<script setup lang="ts">
import { useId } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { adminNavigationGroups } from '../router/admin-navigation'

const id = useId()
const route = useRoute()
defineProps<{ collapsible?: boolean }>()
const emit = defineEmits<{ select: [] }>()
function select(event: MouseEvent, name: string) {
  // Mantém o comportamento nativo de abrir links em outra aba/janela.
  // Em outro destino, o drawer fecha quando a navegação for concluída.
  if (route.name === name && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    emit('select')
  }
}
</script>

<template>
  <div :class="collapsible ? 'space-y-1' : 'space-y-4'">
    <component
      :is="collapsible ? 'details' : 'section'"
      v-for="group in adminNavigationGroups"
      :key="group.name"
      :aria-labelledby="collapsible ? undefined : id + '-' + group.name"
      :open="collapsible ? group.items.some(item => item.name === route.name) : undefined"
    >
      <component
        :is="collapsible ? 'summary' : 'h2'"
        :id="id + '-' + group.name"
        :class="collapsible
          ? 'admin-navigation-summary min-h-11 cursor-pointer rounded-control px-3 py-2.5 text-label'
          : 'px-3 pb-1 text-caption text-muted'"
      >
        {{ group.label }}
      </component>
      <ul class="space-y-0.5" :class="collapsible ? 'pb-2 pl-2' : undefined">
        <li v-for="item in group.items" :key="item.name">
          <RouterLink
            :to="{ name: item.name }"
            class="admin-sidebar__link flex items-center gap-2.5 rounded-control px-3 py-2 text-label"
            @click="select($event, item.name)"
          >
            <component :is="item.icon" :size="18" class="shrink-0" aria-hidden="true" />
            <span class="min-w-0 wrap-anywhere">{{ item.label }}</span>
          </RouterLink>
        </li>
      </ul>
    </component>
  </div>
</template>
