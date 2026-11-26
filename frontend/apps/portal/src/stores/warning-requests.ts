import { computed, shallowRef, watch } from 'vue'
import { defineStore } from 'pinia'
import { driverDemoEnabled } from '@maragobus/shared/auth/driver-demo'
import { isDemoDriver } from '@maragobus/shared/auth/mock-drivers'
import type { TravelDate } from '../types/reservation-availability'
import { useReservationsStore } from './reservations'

export const warningRequestLabels = {
  PENDENTE: 'Pendente',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
} as const

interface WarningRequest {
  readonly id: string
  readonly reservationId: string
  readonly studentId: string
  readonly studentName?: string
  readonly travelDate: TravelDate
  readonly driverId: string
  readonly reason: string
  readonly createdAt: string
  readonly status: keyof typeof warningRequestLabels
}

export const useWarningRequestsStore = defineStore('warning-requests', () => {
  const reservations = useReservationsStore()
  const requests = shallowRef<WarningRequest[]>([])
  if (import.meta.env.DEV && !import.meta.env.PROD) {
    watch(driverDemoEnabled, active => {
      if (!active) requests.value = requests.value.filter(item => !isDemoDriver(item.driverId))
    }, { flush: 'sync' })
  }
  const driverId = computed(() => reservations.driver?.id)
  const ownRequests = computed(() => Object.freeze(driverId.value
    ? requests.value.filter(item => item.driverId === driverId.value)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    : []))
  let fallbackId = 0

  function create(reservationId: string, reason: string) {
    const owner = driverId.value
    if (!owner) return { status: 'driver-required' } as const
    const trimmedReason = reason.trim()
    if (!trimmedReason) return { status: 'reason-required' } as const
    const reservation = reservations.findDriverReservationForWarning(reservationId)
    if (!reservation) return { status: 'reservation-unavailable' } as const
    if (requests.value.some(item => item.reservationId === reservationId
      && (item.status === 'PENDENTE' || item.status === 'APROVADA'))) {
      return { status: 'duplicate' } as const
    }

    const request: WarningRequest = Object.freeze({
      ...reservation,
      id: globalThis.crypto?.randomUUID?.() ?? `demo-warning-request-${++fallbackId}`,
      reservationId,
      driverId: owner,
      reason: trimmedReason,
      createdAt: new Date().toISOString(),
      status: 'PENDENTE',
    })
    requests.value = [request, ...requests.value]
    return { status: 'created', request } as const
  }

  return { driverId, ownRequests, create }
})
