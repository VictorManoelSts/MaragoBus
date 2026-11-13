<script setup lang="ts">
import PortalNavigation from './PortalNavigation.vue'
import { studentNavigationItems } from '../router/student-navigation'

withDefaults(defineProps<{ variant?: 'desktop' | 'mobile' }>(), { variant: 'desktop' })
</script>

<template>
  <PortalNavigation :items="studentNavigationItems" label="Navegação do aluno" :variant="variant" />
</template>
