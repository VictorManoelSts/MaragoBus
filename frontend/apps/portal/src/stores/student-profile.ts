import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { getMockReservationForm } from '../mocks/reservation-form'

export const useStudentProfileStore = defineStore('student-profile', () => {
  const session = useSessionStore()
  const student = computed(() => session.authenticated && session.user?.role === 'student' ? session.user : null)
  const defaultPointId = ref<string | null>(null)
  watch(() => student.value?.id, () => { defaultPointId.value = null }, { flush: 'sync' })

  const reservationContext = computed(() => {
    const context = getMockReservationForm(student.value?.id)
    return { ...context, defaultBoardingPointId: defaultPointId.value ?? context.defaultBoardingPointId }
  })

  function saveDefaultPoint(pointId: string) {
    if (!student.value) return false
    if (!reservationContext.value.boardingPoints.some(point => point.id === pointId)) return false
    defaultPointId.value = pointId
    return true
  }

  return { student, defaultPointId, reservationContext, saveDefaultPoint }
})
