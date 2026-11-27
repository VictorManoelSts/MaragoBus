<script setup lang="ts">
import { RouterView } from 'vue-router'
import PortalNavigation from '../components/PortalNavigation.vue'
import { driverNavigationItems } from '../router/driver-navigation'
import PortalLayout from './PortalLayout.vue'
</script>

<template>
  <PortalLayout class="driver-layout">
    <template #desktop-navigation>
      <PortalNavigation :items="driverNavigationItems" label="Navegação do motorista" variant="desktop" />
    </template>
    <RouterView />
    <template #mobile-navigation>
      <PortalNavigation :items="driverNavigationItems" label="Navegação do motorista" variant="mobile" />
    </template>
  </PortalLayout>
</template>
