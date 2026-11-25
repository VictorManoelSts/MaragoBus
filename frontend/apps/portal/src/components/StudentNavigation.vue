<script setup lang="ts">
import { BaseBadge } from '@maragobus/shared'
import PortalNavigation from './PortalNavigation.vue'
import { studentNavigationItems } from '../router/student-navigation'
import { useStudentNotificationsStore } from '../stores/student-notifications'

withDefaults(defineProps<{ variant?: 'desktop' | 'mobile' }>(), { variant: 'desktop' })
const notifications = useStudentNotificationsStore()
</script>

<template>
  <PortalNavigation :items="studentNavigationItems" label="Navegação do aluno" :variant="variant">
    <template #item-decoration="{ item }">
      <template v-if="item.name === 'announcements' && notifications.unreadCount">
        <BaseBadge
          variant="info" size="sm" aria-hidden="true"
          :class="variant === 'mobile' ? 'absolute right-0 top-0' : 'ml-auto'"
        >
          {{ notifications.unreadCount }}
        </BaseBadge>
        <span class="sr-only">
          {{ notifications.unreadCount === 1 ? '1 notificação não lida' : `${notifications.unreadCount} notificações não lidas` }}
        </span>
      </template>
    </template>
  </PortalNavigation>
</template>
