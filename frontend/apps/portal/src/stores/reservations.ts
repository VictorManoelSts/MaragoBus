import { computed, ref, shallowRef, watch } from 'vue'
import { defineStore } from 'pinia'
import { driverDemoEnabled } from '@maragobus/shared/auth/driver-demo'
import { isDemoDriver } from '@maragobus/shared/auth/mock-drivers'
import { useSessionStore } from '@maragobus/shared/auth/session'
import type { ReservationAvailability, TransportClosure, TravelDate } from '../types/reservation-availability'
import type { ReservationFormContext } from '../types/reservation-form'
import type { StudentHomeSummary, StudentReservationSummary } from '../types/student-home'
import { getCancellationDeadline, getReservationAvailability } from '../utils/reservation-availability'
import { getReceiptAvailability } from '../utils/reservation-receipt'
import { getDriverDemoReservations } from '../mocks/driver-demo-reservations'

import { useStudentDemoStore } from './student-demo'

export type SimulatedReservation = Omit<StudentReservationSummary, 'status'> & {
  studentId: string
  studentName?: string
  studentPhone?: string
  boardingPointId: string
  confirmedAt: string
} & ({ status: 'confirmed'; cancelledAt?: never } | { status: 'cancelled'; cancelledAt: string })

interface ConfirmationRequest {
  travelDate: TravelDate | null
  context: ReservationFormContext
  boardingPointId: string
  closures: readonly TransportClosure[]
}

export const useReservationsStore = defineStore('reservations', () => {
  const session = useSessionStore()
  const reservations = ref<SimulatedReservation[]>([])
  const studentDemo = useStudentDemoStore()
  const studentDemoReservations = ref<SimulatedReservation[]>([])
  watch(() => studentDemo.scenario, scenario => {
    studentDemoReservations.value = scenario ? [...scenario.reservations] : []
  }, { immediate: true, flush: 'sync' })
  const studentRecords = computed(() => studentDemo.scenario ? studentDemoReservations.value : reservations.value)
  const demoReservations = shallowRef<SimulatedReservation[]>([])
  if (import.meta.env.DEV && !import.meta.env.PROD) {
    watch(driverDemoEnabled, active => {
      demoReservations.value = active ? getDriverDemoReservations(new Date()) : []
    }, { immediate: true, flush: 'sync' })
  }
  const demoDriver = computed(() => import.meta.env.DEV && !import.meta.env.PROD &&
    session.user?.role === 'driver' && isDemoDriver(session.user.id))
  const driver = computed(() => {
    const user = session.user
    if (!session.authenticated || user?.role !== 'driver') return
    if (import.meta.env.DEV && !import.meta.env.PROD && demoDriver.value && !driverDemoEnabled()) return
    return user
  })
  const driverReservations = computed(() => demoDriver.value ? demoReservations.value : reservations.value)
  const confirming = ref(false)
  const studentId = computed(() =>
    session.authenticated && session.user?.role === 'student' ? session.user.id : undefined)
  const studentReservations = computed(() => {
    const owner = studentId.value
    return owner ? studentRecords.value.filter(item => item.studentId === owner) : []
  })
  let fallbackId = 0

  function findReservation(travelDate: TravelDate) {
    return studentReservations.value.find(item => item.travelDate === travelDate)
  }

  function findConfirmed(travelDate: TravelDate) {
    const reservation = findReservation(travelDate)
    return reservation?.status === 'confirmed' ? reservation : undefined
  }

  function listDriverReservations(travelDate: TravelDate) {
    if (!driver.value) return []

    return driverReservations.value
      .filter(item => item.travelDate === travelDate && item.status === 'confirmed')
      .map(({ id, studentName, studentPhone, college, boardingPointId, boardingPoint }) =>
        Object.freeze({ id, studentName, college, boardingPointId, boardingPoint, ...(studentPhone && { studentPhone }) }))
  }

  function countConfirmedByCollege(travelDate: TravelDate) {
    const counts = new Map<string, number>()
    if (!driver.value) return counts
    for (const reservation of driverReservations.value) {
      if (reservation.travelDate === travelDate && reservation.status === 'confirmed') {
        counts.set(reservation.college, (counts.get(reservation.college) ?? 0) + 1)
      }
    }
    return counts
  }

  function findDriverReservationForWarning(id: string) {
    if (!driver.value) return

    const reservation = driverReservations.value.find(item => item.id === id && item.status === 'confirmed')
    if (!reservation) return
    const { studentId, studentName, travelDate } = reservation
    return { studentId, studentName, travelDate }
  }

  function getHomeSummary(today: TravelDate): StudentHomeSummary {
    let futureReservation: SimulatedReservation | null = null
    for (const reservation of studentReservations.value) {
      if (reservation.status === 'confirmed' && reservation.travelDate > today
        && (!futureReservation || reservation.travelDate < futureReservation.travelDate)) {
        futureReservation = reservation
      }
    }
    return { currentReservation: findReservation(today) ?? null, futureReservation }
  }

  function validateConfirmation(request: ConfirmationRequest, availability: ReservationAvailability) {
    if (confirming.value) return { status: 'busy' } as const
    const owner = studentId.value
    if (!owner) return { status: 'student-required' } as const
    const date = request.travelDate
    if (availability.status !== 'open' || availability.window.travelDate !== date) {
      return { status: 'unavailable' } as const
    }
    if (findReservation(date)) return { status: 'duplicate' } as const
    const college = request.context.college?.trim()
    if (!college) return { status: 'college-required' } as const
    const point = request.context.boardingPoints.find(item => item.id === request.boardingPointId)
    const boardingPoint = point?.name.trim()
    if (!point?.id || !boardingPoint) return { status: 'point-required' } as const
    return { status: 'ready', owner, date, college, boardingPoint, boardingPointId: point.id } as const
  }

  function confirm(request: ConfirmationRequest) {
    const now = studentDemo.now()
    const result = validateConfirmation(request, getReservationAvailability(now, studentDemo.scenario?.closures ?? request.closures))
    if (result.status !== 'ready') return result

    confirming.value = true
    try {
      const reservation: SimulatedReservation = {
        id: globalThis.crypto?.randomUUID?.() ?? `demo-reservation-${++fallbackId}`,
        studentId: result.owner,
        studentName: session.user?.name.trim() || undefined,
        travelDate: result.date,
        college: result.college,
        boardingPoint: result.boardingPoint,
        boardingPointId: result.boardingPointId,
        confirmedAt: now.toISOString(),
        status: 'confirmed',
      }
      studentRecords.value.push(reservation)
      return { status: 'confirmed', reservation } as const
    } finally {
      confirming.value = false
    }
  }

  function findOwnedReservation(id: string) {
    return studentReservations.value.find(item => item.id === id)
  }

  function getReceiptReservation(id: string, reference: Date) {
    const reservation = findOwnedReservation(id)
    return reservation && getReceiptAvailability(reservation, reference) === 'available' ? reservation : undefined
  }

  function cancel(reservationId: string) {
    const now = studentDemo.now()
    const reservation = findOwnedReservation(reservationId)
    if (!reservation) return 'not-found'
    if (reservation.status !== 'confirmed') return 'already-cancelled'
    if (now >= getCancellationDeadline(reservation.travelDate)) return 'deadline-passed'

    studentRecords.value[studentRecords.value.indexOf(reservation)] = {
      ...reservation, status: 'cancelled', cancelledAt: now.toISOString(),
    }
    return 'cancelled'
  }

  return {
    studentReservations, confirming, studentId, driver, demoDriver, findReservation, findConfirmed, listDriverReservations,
    findDriverReservationForWarning, countConfirmedByCollege,
    getHomeSummary, getReceiptReservation, validateConfirmation, confirm, cancel,
  }
})
