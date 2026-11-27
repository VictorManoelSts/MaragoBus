<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useId, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Bell, X } from '@lucide/vue'
import { BaseBadge, BaseButton, BaseCard } from '@maragobus/shared'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { useStudentNotificationsStore } from '../stores/student-notifications'
import { transportTimeZone } from '../utils/reservation-availability'

const store = useStudentNotificationsStore()
const session = useSessionStore()
const route = useRoute()
const panelId = useId()
const titleId = panelId + '-title'
const countId = panelId + '-count'
const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: transportTimeZone })
const root = ref<HTMLElement>()
const bell = ref<HTMLButtonElement>()
const title = ref<HTMLHeadingElement>()
const isOpen = ref(false)
const unreadLabel = computed(() => store.unreadCount === 1
  ? '1 notificação não lida'
  : `${store.unreadCount} notificações não lidas`)

function close(restoreFocus = true) {
  if (!isOpen.value) return
  isOpen.value = false
  if (restoreFocus) bell.value?.focus()
}

async function toggle() {
  if (isOpen.value) {
    close()
    return
  }
  isOpen.value = true
  await nextTick()
  title.value?.focus()
}

function dismissOnEscape(event: KeyboardEvent) {
  if (isOpen.value && event.key === 'Escape' && !event.defaultPrevented) {
    event.preventDefault()
    close()
  }
}

function dismissOutside(event: MouseEvent) {
  if (event.target instanceof Node && !root.value?.contains(event.target)) {
    const active = document.activeElement
    close(active === document.body || root.value?.contains(active) === true)
  }
}

function dismissOnFocusOut(event: FocusEvent) {
  if (event.relatedTarget instanceof Node && !root.value?.contains(event.relatedTarget)) close(false)
}

onMounted(() => {
  document.addEventListener('keydown', dismissOnEscape)
  document.addEventListener('click', dismissOutside, true)
})
onUnmounted(() => {
  document.removeEventListener('keydown', dismissOnEscape)
  document.removeEventListener('click', dismissOutside, true)
})

watch(() => route.path, () => close(false))
watch(() => session.user?.id, () => close(root.value?.contains(document.activeElement) === true))

async function focusAfterRemoval(trigger: EventTarget | null, destination?: HTMLElement) {
  await nextTick()
  if (isOpen.value && trigger instanceof HTMLElement && !trigger.isConnected && document.activeElement === document.body) {
    destination?.focus()
  }
}

function markAsRead(id: string, event: MouseEvent) {
  const trigger = event.currentTarget
  const heading = trigger instanceof HTMLElement ? trigger.closest('li')?.querySelector('h3') : undefined
  store.markAsRead(id)
  void focusAfterRemoval(trigger, heading ?? title.value)
}

function markAllAsRead(event: MouseEvent) {
  store.markAllAsRead()
  void focusAfterRemoval(event.currentTarget, title.value)
}
</script>

<template>
  <div ref="root" class="relative ml-auto shrink-0" @focusout="dismissOnFocusOut">
    <button
      ref="bell"
      type="button"
      aria-label="Notificações"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      :aria-controls="isOpen ? panelId : undefined"
      :aria-describedby="countId"
      class="portal-navigation__link relative flex size-11 cursor-pointer items-center justify-center rounded-control"
      @click="toggle"
    >
      <Bell :size="22" aria-hidden="true" />
      <BaseBadge v-if="store.unreadCount" variant="info" size="sm" aria-hidden="true" class="absolute top-0 right-0">
        {{ store.unreadCount }}
      </BaseBadge>
    </button>
    <span :id="countId" class="sr-only">{{ unreadLabel }}</span>

    <section
      v-if="isOpen"
      :id="panelId"
      role="dialog"
      :aria-labelledby="titleId"
      class="notification-panel absolute top-full right-0 z-40 mt-2 flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card"
    >
      <div class="flex shrink-0 items-start justify-between gap-2 border-b border-line px-4 py-3">
        <div class="min-w-0">
          <h2 :id="titleId" ref="title" tabindex="-1" class="text-section">Notificações</h2>
          <p role="status" class="text-helper text-muted">{{ unreadLabel }}</p>
        </div>
        <BaseButton variant="ghost" size="sm" aria-label="Fechar notificações" @click="close()">
          <X :size="20" aria-hidden="true" />
        </BaseButton>
      </div>

      <div class="notification-panel__content min-h-0 space-y-3 overflow-y-auto overscroll-contain p-4 wrap-anywhere">
        <p v-if="!store.notifications.length" class="text-body text-muted">Você ainda não tem notificações.</p>
        <template v-else>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-helper text-muted">Avisos de demonstração.</p>
            <BaseButton v-if="store.unreadCount" variant="outline" size="sm" @click="markAllAsRead">
              Marcar todas como lidas
            </BaseButton>
          </div>
          <ul class="space-y-3">
            <li v-for="notice in store.notifications" :key="notice.id">
              <BaseCard :class="{ 'border-l-4 border-l-identity': !notice.read }">
                <div class="space-y-2">
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <h3 tabindex="-1" class="min-w-0 text-label" :aria-describedby="panelId + '-' + notice.id">
                      {{ notice.title }}
                    </h3>
                    <BaseBadge :id="panelId + '-' + notice.id" :variant="notice.read ? 'neutral' : 'info'">
                      {{ notice.read ? 'Lida' : 'Não lida' }}
                    </BaseBadge>
                  </div>
                  <time :datetime="notice.publishedAt" class="text-helper text-muted">
                    {{ dateFormat.format(new Date(notice.publishedAt)) }}
                  </time>
                  <p class="text-helper">{{ notice.message }}</p>
                  <BaseButton
                    v-if="!notice.read"
                    variant="outline" size="sm"
                    :aria-label="`Marcar como lida: ${notice.title}`"
                    @click="markAsRead(notice.id, $event)"
                  >
                    Marcar como lida
                  </BaseButton>
                </div>
              </BaseCard>
            </li>
          </ul>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.notification-panel {
  width: min(26rem, calc(100cqw - 2rem));
  max-height: calc(100dvh - 6rem - env(safe-area-inset-top) - env(safe-area-inset-bottom));
}

@media (max-height: 24rem) {
  .notification-panel {
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .notification-panel__content {
    flex-shrink: 0;
    overflow: visible;
  }
}
</style>
