<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { hasRouteAccess } from '@maragobus/shared/auth/route-access'
import { useSessionStore } from '@maragobus/shared/auth/session'

const route = useRoute()
const session = useSessionStore()
const canRender = computed(() => route.matched.length > 0
  && (route.meta.requiresAuth === false || (session.ready && hasRouteAccess(route.meta, session.user))))
</script>

<template>
  <RouterView v-if="canRender" />
</template>
