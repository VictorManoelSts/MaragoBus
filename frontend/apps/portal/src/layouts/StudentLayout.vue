<script setup lang="ts">
import { RouterView } from 'vue-router'
import StudentNavigation from '../components/StudentNavigation.vue'
import StudentNotificationsLink from '../components/StudentNotificationsLink.vue'
import PortalLayout from './PortalLayout.vue'
</script>

<template>
  <PortalLayout>
    <template #header-actions><StudentNotificationsLink /></template>
    <template #desktop-navigation><StudentNavigation variant="desktop" /></template>
    <RouterView />
    <template #mobile-navigation><StudentNavigation variant="mobile" /></template>
  </PortalLayout>
</template>
