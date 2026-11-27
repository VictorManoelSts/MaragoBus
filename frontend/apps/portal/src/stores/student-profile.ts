import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { studentDemoSelection } from '@maragobus/shared/auth/student-demo'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { getMockReservationForm } from '../mocks/reservation-form'

import { useStudentDemoStore } from './student-demo'

type ProfilePreferences = {
  email: string
  phone: string
  boardingPointId: string
}

export const useStudentProfileStore = defineStore('student-profile', () => {
  const session = useSessionStore()
  const student = computed(() => session.authenticated && session.user?.role === 'student' ? session.user : null)
  const demo = useStudentDemoStore()
  const regularPoint = ref<string | null>(null)
  const demoPoint = ref<string | null>(null)
  const regularStudentId = ref(studentDemoSelection() ? undefined : student.value?.id)
  const ownsRegularProfile = computed(() => !!student.value && student.value.id === regularStudentId.value)
  const defaultPointId = computed(() => demo.scenario ? demoPoint.value : ownsRegularProfile.value ? regularPoint.value : null)
  const regularContact = ref<Pick<ProfilePreferences, 'email' | 'phone'> | null>(null)
  const demoContact = ref<Pick<ProfilePreferences, 'email' | 'phone'> | null>(null)
  const registration = computed(() => demo.scenario?.profile)
  watch(() => demo.scenario, () => {
    demoPoint.value = null
    demoContact.value = null
  }, { flush: 'sync' })
  function resetRegularProfile(id?: string) {
    regularStudentId.value = id
    regularPoint.value = null
    regularContact.value = null
  }

  watch(() => student.value?.id, id => {
    if (!studentDemoSelection() && id !== regularStudentId.value) {
      resetRegularProfile(id)
    }
  }, { flush: 'sync' })

  const reservationContext = computed(() => {
    const context = getMockReservationForm(student.value?.id)
    return { ...context, defaultBoardingPointId: defaultPointId.value ?? demo.scenario?.defaultBoardingPointId ?? context.defaultBoardingPointId }
  })

  const preferences = computed<ProfilePreferences>(() => {
    const contact = demo.scenario ? demoContact.value : ownsRegularProfile.value ? regularContact.value : null
    return {
      email: contact?.email ?? registration.value?.email ?? '',
      phone: contact?.phone ?? '',
      boardingPointId: reservationContext.value.defaultBoardingPointId ?? '',
    }
  })

  function hasBoardingPoint(pointId: string) {
    return reservationContext.value.boardingPoints.some(point => point.id === pointId)
  }

  function saveDefaultPoint(pointId: string) {
    if (!student.value || !hasBoardingPoint(pointId)) return false
    if (!demo.scenario && !ownsRegularProfile.value) resetRegularProfile(student.value.id)
    const point = demo.scenario ? demoPoint : regularPoint
    point.value = pointId
    return true
  }

  function validatePreferences({ email, phone, boardingPointId }: ProfilePreferences) {
    return {
      email: email.trim() && !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email.trim())
        ? 'Informe um e-mail válido.' : undefined,
      phone: phone.trim() && !/^(?:\(\d{2}\)\s?|\d{2}\s?)\d{4,5}-?\d{4}$/.test(phone.trim())
        ? 'Informe um telefone com DDD e 8 ou 9 dígitos.' : undefined,
      boardingPointId: boardingPointId !== preferences.value.boardingPointId && !hasBoardingPoint(boardingPointId)
        ? 'Selecione um ponto de embarque válido.' : undefined,
    }
  }

  function savePreferences(draft: ProfilePreferences) {
    if (!student.value || Object.values(validatePreferences(draft)).some(Boolean)) return false
    if (!demo.scenario && !ownsRegularProfile.value) resetRegularProfile(student.value.id)
    const contact = demo.scenario ? demoContact : regularContact
    contact.value = { email: draft.email.trim(), phone: draft.phone.trim() }
    if (draft.boardingPointId !== preferences.value.boardingPointId) saveDefaultPoint(draft.boardingPointId)
    return true
  }

  return {
    student, registration, defaultPointId, reservationContext, preferences,
    saveDefaultPoint, validatePreferences, savePreferences,
  }
})
