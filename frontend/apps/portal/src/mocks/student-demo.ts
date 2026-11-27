import type { SimulatedReservation } from '../stores/reservations'
import type { TransportClosure, TravelDate } from '../types/reservation-availability'
import { getReservationWindow, getTransportDate, isRegularTravelDay, nextRegularTravelDay } from '../utils/reservation-availability'
import { getMockReservationForm } from './reservation-form'
import { getDemonstrationNotices } from './student-notifications'

const scenarios = {
  completo: { hoursAfterClosing: 7, current: 'confirmed', future: true },
  aberta: { hoursAfterClosing: -2, current: null, future: false },
  cancelada: { hoursAfterClosing: 3, current: 'cancelled', future: false },
  'prazo-encerrado': { hoursAfterClosing: 5, current: 'confirmed', future: false },
  'sem-reserva': { hoursAfterClosing: 3, current: null, future: false },
  'sem-transporte': { hoursAfterClosing: -2, current: null, future: false },
} as const

export const demoStudentId = 'mock-student-test'

type StudentDemoProfile = {
  cpf: string
  email: string
  course: string
  educationModality: string
}

export function resolveStudentDemoSelection(value: unknown): keyof typeof scenarios {
  return typeof value === 'string' && Object.hasOwn(scenarios, value)
    ? value as keyof typeof scenarios : 'completo'
}

function previousTravelDay(date: TravelDate, includeDate = false): TravelDate {
  const day = new Date(date + 'T00:00:00Z')
  if (!includeDate) day.setUTCDate(day.getUTCDate() - 1)
  while (!isRegularTravelDay(day.toISOString().slice(0, 10))) {
    day.setUTCDate(day.getUTCDate() - 1)
  }
  return day.toISOString().slice(0, 10)
}

export function createStudentDemo(selection: string, reference = new Date()) {
  const name = resolveStudentDemoSelection(selection)
  const scenario = scenarios[name]
  const today = previousTravelDay(getTransportDate(reference), true)
  const previous = previousTravelDay(today)
  const closing = getReservationWindow(today).closesAt.getTime()
  const now = new Date(closing + scenario.hoursAfterClosing * 3_600_000)
  const form = getMockReservationForm(demoStudentId)
  const point = form.boardingPoints.find(item => item.id === 'demo-center')!
  const closures: readonly TransportClosure[] = name === 'sem-transporte'
    ? [{ date: today, reason: 'Manutenção', description: 'Interrupção demonstrativa para manutenção do veículo.' }]
    : []

  function reservation(travelDate: TravelDate, status: SimulatedReservation['status']): SimulatedReservation {
    const window = getReservationWindow(travelDate)
    const fields = {
      id: `aluno-demo-${name}-${travelDate}`,
      studentId: demoStudentId,
      travelDate,
      college: form.college!,
      boardingPoint: point.name,
      boardingPointId: point.id,
      confirmedAt: new Date(window.opensAt.getTime() + 60_000).toISOString(),
    }
    return status === 'confirmed' ? { ...fields, status } : {
      ...fields, status, cancelledAt: new Date(window.closesAt.getTime() + 3_600_000).toISOString(),
    }
  }

  const reservations = name === 'sem-reserva' ? [] : [
    reservation(previous, 'confirmed'),
    reservation(previousTravelDay(previous), 'cancelled'),
  ]
  if (scenario.current) reservations.push(reservation(today, scenario.current))
  if (scenario.future) reservations.push(reservation(nextRegularTravelDay(today), 'confirmed'))

  const profile: StudentDemoProfile = {
    cpf: '900.000.001-75',
    email: 'aluno.demo@example.invalid',
    course: 'Sistemas de Informação',
    educationModality: 'Presencial',
  }
  return {
    now, closures, reservations,
    profile,
    defaultBoardingPointId: point.id,
    readNoticeIds: getDemonstrationNotices(demoStudentId).slice(0, 1).map(notice => notice.id),
  }
}
