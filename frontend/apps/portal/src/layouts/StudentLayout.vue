<script setup lang="ts">
import { RouterView } from 'vue-router'
import StudentNavigation from '../components/StudentNavigation.vue'
import StudentNotificationsPanel from '../components/StudentNotificationsPanel.vue'
import PortalThemeSwitch from '../components/PortalThemeSwitch.vue'
import PortalLayout from './PortalLayout.vue'
</script>

<template>
  <PortalLayout class="student-layout @container">
    <template #header-controls>
      <div class="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <PortalThemeSwitch />
        <StudentNotificationsPanel />
      </div>
    </template>
    <template #desktop-navigation><StudentNavigation variant="desktop" /></template>
    <RouterView />
    <template #mobile-navigation><StudentNavigation variant="mobile" /></template>
  </PortalLayout>
</template>
