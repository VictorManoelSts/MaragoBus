import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { getMockReservationForm } from '../src/mocks/reservation-form'
import { useReservationsStore } from '../src/stores/reservations'
import { useWarningRequestsStore } from '../src/stores/warning-requests'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'

const requestDate = '2026-11-16'

function confirmReservation(studentId: string, travelDate = requestDate) {
  vi.setSystemTime(new Date(travelDate + 'T13:00:00.000Z'))
  const session = useSessionStore()
  session.user = { id: studentId, name: 'Aluno ' + studentId, role: 'student' }
  const result = useReservationsStore().confirm({
    travelDate,
    context: { ...getMockReservationForm(studentId), college: 'Faculdade de teste' },
    boardingPointId: 'demo-center',
    closures: [],
  })
  if (result.status !== 'confirmed') throw new Error(result.status)
  return result.reservation
}

function setDriver(id: string, name = 'Motorista de Teste') {
  useSessionStore().user = { id, name, role: 'driver' }
}

describe('Store de solicitações de advertência', () => {
  beforeEach(async () => {
    await setMockSession('driver')
    vi.setSystemTime(new Date('2026-11-16T13:59:00.000Z'))
  })

  it('cria solicitação pendente com os dados da reserva e motorista responsável', () => {
    const reservation = confirmReservation('aluno-1')
    vi.setSystemTime(new Date('2026-11-16T13:59:00.000Z'))
    setDriver('motorista-1', 'Motorista responsável')
    const store = useWarningRequestsStore()
    const result = store.create(reservation.id, '  Não aguardou no ponto.  ')

    expect(result.status).toBe('created')
    if (result.status !== 'created') return
    expect(result.request).toEqual({
      id: expect.any(String),
      reservationId: reservation.id,
      studentId: 'aluno-1',
      studentName: 'Aluno aluno-1',
      travelDate: requestDate,
      driverId: 'motorista-1',
      reason: 'Não aguardou no ponto.',
      createdAt: '2026-11-16T13:59:00.000Z',
      status: 'PENDENTE',
    })
    expect(store.ownRequests).toEqual([result.request])
  })

  it.each(['', '   ', '\n\t'])('exige motivo não vazio para %j', reason => {
    const reservation = confirmReservation('aluno-1')
    setDriver('motorista-1')
    const store = useWarningRequestsStore()
    expect(store.create(reservation.id, reason).status).toBe('reason-required')
    expect(store.ownRequests).toEqual([])
  })

  it('exige perfil de motorista e preserva solicitações de outros perfis', async () => {
    const reservation = confirmReservation('aluno-1')
    const store = useWarningRequestsStore()
    expect(store.create(reservation.id, 'Motivo').status).toBe('driver-required')
    await setMockSession('student')
    expect(store.create(reservation.id, 'Motivo').status).toBe('driver-required')
    expect(store.ownRequests).toEqual([])
  })

  it('aceita apenas uma reserva confirmada disponível', () => {
    const reservation = confirmReservation('aluno-1')
    const cancelled = confirmReservation('aluno-2', '2026-11-17')
    const reservations = useReservationsStore()
    setDriver('motorista-1')
    expect(useWarningRequestsStore().create('ausente', 'Motivo').status).toBe('reservation-unavailable')

    useSessionStore().user = { id: 'aluno-2', name: 'Aluno aluno-2', role: 'student' }
    expect(reservations.cancel(cancelled.id)).toBe('cancelled')
    setDriver('motorista-1')
    expect(useWarningRequestsStore().create(cancelled.id, 'Motivo').status).toBe('reservation-unavailable')
    expect(useWarningRequestsStore().create(reservation.id, 'Motivo').status).toBe('created')
  })

  it('impede duplicidade pendente para a mesma reserva, inclusive por outro motorista', () => {
    const reservation = confirmReservation('aluno-1')
    setDriver('motorista-1')
    const store = useWarningRequestsStore()
    expect(store.create(reservation.id, 'Primeiro motivo').status).toBe('created')
    expect(store.create(reservation.id, 'Outro motivo').status).toBe('duplicate')
    setDriver('motorista-2', 'Outro motorista')
    expect(store.create(reservation.id, 'Motivo de outro motorista').status).toBe('duplicate')
    expect(store.ownRequests).toEqual([])
  })

  it('isola a consulta por motorista e ordena da criação mais recente para a mais antiga', () => {
    const firstReservation = confirmReservation('aluno-1')
    const secondReservation = confirmReservation('aluno-2', '2026-11-17')
    setDriver('motorista-1')
    const store = useWarningRequestsStore()
    vi.setSystemTime(new Date('2026-11-16T13:59:00.000Z'))
    const first = store.create(firstReservation.id, 'Primeiro motivo')
    vi.setSystemTime(new Date('2026-11-16T14:00:00.000Z'))
    const second = store.create(secondReservation.id, 'Segundo motivo')

    expect(store.ownRequests.map(item => item.createdAt)).toEqual([
      '2026-11-16T14:00:00.000Z',
      '2026-11-16T13:59:00.000Z',
    ])
    expect(first.status).toBe('created')
    expect(second.status).toBe('created')

    setDriver('motorista-2')
    expect(store.ownRequests).toEqual([])
    setDriver('motorista-1')
    expect(store.ownRequests).toHaveLength(2)
  })
})
