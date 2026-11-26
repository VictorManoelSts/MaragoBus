import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { studentDemoSelection } from '@maragobus/shared/auth/student-demo'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { getDemonstrationNotices } from '../mocks/student-notifications'

import { useStudentDemoStore } from './student-demo'

export const useStudentNotificationsStore = defineStore('student-notifications', () => {
  const session = useSessionStore()
  const studentId = computed(() =>
    session.authenticated && session.user?.role === 'student' ? session.user.id : undefined)
  const demo = useStudentDemoStore()
  const regularReadIds = ref<string[]>([])
  const demoReadIds = ref<string[]>([])
  const readIds = computed({
    get: () => demo.scenario ? demoReadIds.value : regularReadIds.value,
    set: ids => {
      const target = demo.scenario ? demoReadIds : regularReadIds
      target.value = ids
    },
  })
  watch(() => demo.scenario, scenario => {
    demoReadIds.value = [...(scenario?.readNoticeIds ?? [])]
  }, { immediate: true, flush: 'sync' })
  let regularStudentId = studentDemoSelection() ? undefined : studentId.value
  watch(studentId, id => {
    if (!studentDemoSelection() && id !== regularStudentId) {
      regularStudentId = id
      regularReadIds.value = []
    }
  }, { flush: 'sync' })

  const notices = computed(() => [...getDemonstrationNotices(studentId.value)]
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt)))
  const notifications = computed(() => notices.value.map(notice => ({
    ...notice, read: readIds.value.includes(notice.id),
  })))
  const unreadCount = computed(() => notifications.value.filter(notice => !notice.read).length)

  function markAsRead(id: string) {
    if (notices.value.some(notice => notice.id === id) && !readIds.value.includes(id)) {
      readIds.value.push(id)
    }
  }

  function markAllAsRead() {
    readIds.value = notices.value.map(notice => notice.id)
  }

  return { readIds, notifications, unreadCount, markAsRead, markAllAsRead }
})
