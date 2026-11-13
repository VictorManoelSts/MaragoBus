<script setup lang="ts">
import { RouterView } from 'vue-router'
import AdminSidebar from '../components/AdminSidebar.vue'
import AdminMobileNavigation from '../components/AdminMobileNavigation.vue'
import AdminLayout from './AdminLayout.vue'
</script>

<template>
  <AdminLayout>
    <template #header-actions><AdminMobileNavigation /></template>
    <template #desktop-navigation><AdminSidebar /></template>
    <RouterView />
  </AdminLayout>
</template>
