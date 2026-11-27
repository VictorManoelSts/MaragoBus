<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import { BaseButton } from '@maragobus/shared'
import { authNavigation } from '@maragobus/shared/auth/navigation'
import { useSessionStore } from '@maragobus/shared/auth/session'
import StudentNavigation from '../components/StudentNavigation.vue'
import StudentNotificationsPanel from '../components/StudentNotificationsPanel.vue'
import PortalLayout from './PortalLayout.vue'

const router = useRouter()
const session = useSessionStore()

async function logout() {
  session.logout()
  await authNavigation.afterLogout(router)
}
</script>

<template>
  <PortalLayout class="student-layout @container">
    <template #header-actions>
      <div class="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <BaseButton variant="outline" size="sm" @click="logout">Sair</BaseButton>
        <StudentNotificationsPanel />
      </div>
    </template>
    <template #desktop-navigation><StudentNavigation variant="desktop" /></template>
    <RouterView />
    <template #mobile-navigation><StudentNavigation variant="mobile" /></template>
  </PortalLayout>
</template>
