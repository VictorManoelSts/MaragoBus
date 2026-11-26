<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { hasRouteAccess } from '@maragobus/shared/auth/route-access'
import { useSessionStore } from '@maragobus/shared/auth/session'

const route = useRoute()
const session = useSessionStore()
const canRender = computed(() => route.matched.length > 0
  && (route.meta.requiresAuth === false || (session.ready && hasRouteAccess(route.meta, session.user))))

// Hashes e filtros na URL não representam uma troca de página.
watch(() => route.path, () => {
  if (canRender.value) document.getElementById('portal-content')?.focus()
}, { flush: 'post' })
</script>

<template>
  <RouterView v-if="canRender" />
</template>
