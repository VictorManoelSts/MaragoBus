<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { BaseBadge, BaseButton, BaseCard } from '@maragobus/shared'
import { useStudentNotificationsStore } from '../stores/student-notifications'
import { transportTimeZone } from '../utils/reservation-availability'

const store = useStudentNotificationsStore()
const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: transportTimeZone })
const pageHeading = ref<HTMLElement>()

async function focusAfterRemoval(trigger: EventTarget | null, destination?: HTMLElement) {
  await nextTick()
  if (trigger instanceof HTMLElement && !trigger.isConnected && document.activeElement === document.body) {
    destination?.focus()
  }
}

function markAsRead(id: string, event: MouseEvent) {
  const trigger = event.currentTarget
  const heading = trigger instanceof HTMLElement ? trigger.closest('li')?.querySelector('h2') : undefined
  store.markAsRead(id)
  void focusAfterRemoval(trigger, heading ?? pageHeading.value)
}

function markAllAsRead(event: MouseEvent) {
  store.markAllAsRead()
  void focusAfterRemoval(event.currentTarget, pageHeading.value)
}
</script>

<template>
  <div class="min-w-0 space-y-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0 space-y-3">
        <h1 ref="pageHeading" tabindex="-1" class="text-page">Notificações</h1>
        <p class="max-w-prose text-body text-muted">Espaço exclusivo para avisos administrativos enviados aos alunos.</p>
        <p v-if="store.notifications.length" class="text-helper text-muted">
          Avisos de demonstração. O estado de leitura vale durante a sessão.
        </p>
      </div>
      <BaseButton
        v-if="store.unreadCount" variant="outline" class="w-full sm:w-auto"
        @click="markAllAsRead"
      >
        Marcar todas como lidas
      </BaseButton>
    </div>

    <BaseCard v-if="!store.notifications.length">
      <p class="text-body text-muted">Você ainda não tem notificações.</p>
    </BaseCard>

    <ul v-else class="space-y-4">
      <li v-for="notice in store.notifications" :key="notice.id">
        <BaseCard>
          <div class="space-y-3">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <h2 tabindex="-1" class="min-w-0 text-subtitle" :aria-describedby="`notice-status-${notice.id}`">
                {{ notice.title }}
              </h2>
              <BaseBadge :id="`notice-status-${notice.id}`" :variant="notice.read ? 'neutral' : 'info'">
                {{ notice.read ? 'Lida' : 'Não lida' }}
              </BaseBadge>
            </div>
            <time :datetime="notice.publishedAt" class="text-helper text-muted">
              {{ dateFormat.format(new Date(notice.publishedAt)) }}
            </time>
            <p class="text-body">{{ notice.message }}</p>
          </div>
          <template v-if="!notice.read" #footer>
            <BaseButton
              variant="outline" size="sm" class="w-full sm:w-auto"
              :aria-label="`Marcar como lida: ${notice.title}`"
              @click="markAsRead(notice.id, $event)"
            >
              Marcar como lida
            </BaseButton>
          </template>
        </BaseCard>
      </li>
    </ul>
  </div>
</template>
