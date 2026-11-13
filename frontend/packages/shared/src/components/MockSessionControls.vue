<script setup lang="ts">
import { useRouter } from 'vue-router'
import BaseButton from './BaseButton.vue'
import { useSessionStore } from '../auth/session'
import { authNavigation } from '../auth/navigation'

const session = useSessionStore()
const router = useRouter()
async function logout() {
  session.logout()
  await authNavigation.afterLogout(router)
}
</script>

<template>
  <div v-if="session.authenticated" class="mt-5 space-y-3">
    <p v-if="session.user" class="text-helper text-muted">Sessão de teste: {{ session.user.name }}</p>
    <BaseButton variant="outline" @click="logout">Sair</BaseButton>
  </div>
</template>
