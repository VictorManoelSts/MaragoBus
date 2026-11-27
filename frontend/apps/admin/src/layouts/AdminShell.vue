<script setup lang="ts">
import { watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AdminSidebar from '../components/AdminSidebar.vue'
import AdminMobileNavigation from '../components/AdminMobileNavigation.vue'
import AdminLayout from './AdminLayout.vue'

const route = useRoute()

watch(() => route.path, () => {
  const content = document.getElementById('admin-content')
  if (!content) return
  content.scrollTop = 0
  content.focus()
}, { flush: 'post' })
</script>

<template>
  <AdminLayout :title="route.meta.adminTitle">
    <template #header-actions><AdminMobileNavigation /></template>
    <template #desktop-navigation><AdminSidebar /></template>
    <RouterView />
  </AdminLayout>
</template>
