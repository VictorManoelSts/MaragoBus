import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { studentDemoSelection } from '@maragobus/shared/auth/student-demo'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { getMockReservationForm } from '../mocks/reservation-form'

import { useStudentDemoStore } from './student-demo'

export const useStudentProfileStore = defineStore('student-profile', () => {
  const session = useSessionStore()
  const student = computed(() => session.authenticated && session.user?.role === 'student' ? session.user : null)
  const demo = useStudentDemoStore()
  const regularPoint = ref<string | null>(null)
  const demoPoint = ref<string | null>(null)
  const defaultPointId = computed(() => demo.scenario ? demoPoint.value : regularPoint.value)
  watch(() => demo.scenario, () => { demoPoint.value = null }, { flush: 'sync' })
  let regularStudentId = studentDemoSelection() ? undefined : student.value?.id
  watch(() => student.value?.id, id => {
    if (!studentDemoSelection() && id !== regularStudentId) {
      regularStudentId = id
      regularPoint.value = null
    }
  }, { flush: 'sync' })

  const reservationContext = computed(() => {
    const context = getMockReservationForm(student.value?.id)
    return { ...context, defaultBoardingPointId: defaultPointId.value ?? demo.scenario?.defaultBoardingPointId ?? context.defaultBoardingPointId }
  })

  function saveDefaultPoint(pointId: string) {
    if (!student.value) return false
    if (!reservationContext.value.boardingPoints.some(point => point.id === pointId)) return false
    const point = demo.scenario ? demoPoint : regularPoint
    point.value = pointId
    return true
  }

  return { student, registration: computed(() => demo.scenario?.profile), defaultPointId, reservationContext, saveDefaultPoint }
})
