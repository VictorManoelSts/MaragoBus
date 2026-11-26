<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { BaseBadge } from '@maragobus/shared'
import { studentNotificationsLink as link } from '../router/student-navigation'
import { useStudentNotificationsStore } from '../stores/student-notifications'

const notifications = useStudentNotificationsStore()
const unreadLabel = computed(() => {
  const count = notifications.unreadCount
  return count === 1 ? '1 notificação não lida' : `${count} notificações não lidas`
})
</script>

<template>
  <RouterLink
    :to="{ name: link.name }"
    class="portal-navigation__link relative ml-auto flex size-11 shrink-0 items-center justify-center rounded-control"
  >
    <component :is="link.icon" :size="22" aria-hidden="true" />
    <span class="sr-only">{{ link.label }}</span>
    <template v-if="notifications.unreadCount">
      <BaseBadge variant="info" size="sm" aria-hidden="true" class="absolute top-0 right-0">
        {{ notifications.unreadCount }}
      </BaseBadge>
      <span class="sr-only">{{ unreadLabel }}</span>
    </template>
  </RouterLink>
</template>
