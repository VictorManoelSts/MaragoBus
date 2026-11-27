import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { hasStudentDemoSession, studentDemoSelection } from '@maragobus/shared/auth/student-demo'
import { createStudentDemo, demoStudentId } from '../mocks/student-demo'

export const useStudentDemoStore = defineStore('student-demo', () => {
  const session = useSessionStore()
  const selection = computed(() => {
    if (import.meta.env.DEV && !import.meta.env.PROD
      && session.authenticated && session.user?.role === 'student'
      && session.user.id === demoStudentId && hasStudentDemoSession()) {
      return studentDemoSelection()
    }
    return null
  })
  const scenario = computed(() => {
    if (import.meta.env.DEV && !import.meta.env.PROD && selection.value) {
      return createStudentDemo(selection.value)
    }
    return null
  })
  function now(reference = new Date()) {
    const active = scenario.value
    if (!active) return reference
    return active.suspension ? new Date(reference.getTime() + active.clockOffset) : active.now
  }
  return { scenario, now }
})
