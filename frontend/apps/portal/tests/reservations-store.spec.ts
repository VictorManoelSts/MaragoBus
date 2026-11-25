import { createPinia } from 'pinia'
import { computed } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { getMockReservationForm } from '../src/mocks/reservation-form'
import { useReservationsStore } from '../src/stores/reservations'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'

const request = {
  travelDate: '2026-11-16',
  boardingPointId: 'demo-center',
  context: getMockReservationForm('mock-student-test'),
  closures: [],
}

describe('Store de reservas simuladas', () => {
  beforeEach(async () => {
    await setMockSession('student')
    vi.setSystemTime(new Date('2026-11-16T13:59:00Z'))
  })

  afterEach(() => { vi.useRealTimers() })

  it.each([
    ['2026-11-13T19:59:59.999Z', 'unavailable'],
    ['2026-11-13T20:00:00.000Z', 'confirmed'],
    ['2026-11-16T13:59:59.999Z', 'confirmed'],
    ['2026-11-16T14:00:00.000Z', 'unavailable'],
    ['2026-11-16T14:01:00.000Z', 'unavailable'],
    ['2026-11-16T20:00:00.000Z', 'unavailable'],
  ])('em %s, confirmar a data revisada retorna %s', (instant, status) => {
    vi.setSystemTime(new Date(instant))
    const store = useReservationsStore()
    expect(store.confirm(request).status).toBe(status)
    expect(store.reservations).toHaveLength(status === 'confirmed' ? 1 : 0)
  })

  it('registra os dados confirmados e reflete a atualização reativa na consulta', () => {
    const store = useReservationsStore()
    const current = computed(() => store.findConfirmed(request.travelDate))
    expect(current.value).toBeUndefined()
    expect(store.confirm(request).status).toBe('confirmed')
    expect(current.value).toEqual({
      id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
      studentId: 'mock-student-test',
      travelDate: '2026-11-16',
      boardingPointId: 'demo-center',
      boardingPoint: 'Praça de exemplo — Centro',
      college: 'Faculdade de Demonstração',
      confirmedAt: '2026-11-16T13:59:00.000Z',
      status: 'confirmed',
    })
  })

  it('preserva o registro em tentativas repetidas e permite outra data com ID distinto', () => {
    const store = useReservationsStore()
    expect(store.confirm(request).status).toBe('confirmed')
    const first = store.findConfirmed(request.travelDate)
    expect(store.confirm({ ...request, boardingPointId: 'demo-north' }).status).toBe('duplicate')
    expect(store.findConfirmed(request.travelDate)).toBe(first)
    expect(first?.boardingPointId).toBe('demo-center')

    vi.setSystemTime(new Date('2026-11-16T20:00:00Z'))
    expect(store.confirm({ ...request, travelDate: '2026-11-17' }).status).toBe('confirmed')
    const { currentReservation, futureReservation } = store.getHomeSummary('2026-11-16')
    expect(currentReservation).toBe(first)
    expect(futureReservation?.travelDate).toBe('2026-11-17')
    expect(futureReservation?.id).not.toBe(first?.id)
  })

  it('impede gravação durante outra confirmação', () => {
    const store = useReservationsStore()
    const stop = store.$subscribe(() => {
      if (store.confirming) expect(store.confirm(request).status).toBe('busy')
    }, { flush: 'sync' })
    expect(store.confirm(request).status).toBe('confirmed')
    expect(store.reservations).toHaveLength(1)
    expect(store.confirming).toBe(false)
    stop()
  })

  it('impede data bloqueada e aplica o comportamento conservador após interrupção', () => {
    const store = useReservationsStore()
    expect(store.confirm({ ...request, closures: [{ date: '2026-11-16' }] }).status).toBe('unavailable')
    expect(store.confirm({ ...request, closures: [{ date: '2026-11-13' }] }).status).toBe('unavailable')
    expect(store.reservations).toHaveLength(0)
  })

  it('impede ponto desconhecido, faculdade ausente e sessão sem perfil de aluno', async () => {
    const store = useReservationsStore()
    expect(store.confirm({ ...request, boardingPointId: 'desconhecido' }).status).toBe('point-required')
    expect(store.confirm({ ...request, context: getMockReservationForm('sem-faculdade') }).status).toBe('college-required')
    await setMockSession('driver')
    expect(store.confirm(request).status).toBe('student-required')
    useSessionStore().user = null
    expect(store.confirm(request).status).toBe('student-required')
    expect(store.reservations).toHaveLength(0)
  })

  it('isola consultas e duplicidade por aluno, sem perder a reserva ao voltar à conta', async () => {
    const store = useReservationsStore()
    expect(store.confirm(request).status).toBe('confirmed')
    const first = store.findConfirmed(request.travelDate)
    useSessionStore().user = { id: 'outro-aluno', name: 'Outro aluno', role: 'student' }
    expect(store.findConfirmed(request.travelDate)).toBeUndefined()
    expect(store.getHomeSummary('2026-11-16')).toEqual({ currentReservation: null, futureReservation: null })
    expect(store.confirm({ ...request, context: { ...request.context, college: 'Faculdade de teste' } }).status).toBe('confirmed')
    expect(store.findConfirmed(request.travelDate)?.studentId).toBe('outro-aluno')
    await setMockSession('student')
    expect(store.findConfirmed(request.travelDate)).toBe(first)
  })

  it('começa sem reservas em uma nova instância de Pinia', () => {
    expect(useReservationsStore().confirm(request).status).toBe('confirmed')
    expect(useReservationsStore(createPinia()).reservations).toHaveLength(0)
  })

  it.each([
    ['2026-11-13T21:00:00.000Z', 'cancelled'],
    ['2026-11-16T13:59:00.000Z', 'cancelled'],
    ['2026-11-16T18:59:59.999Z', 'cancelled'],
    ['2026-11-16T19:00:00.000Z', 'deadline-passed'],
    ['2026-11-16T19:01:00.000Z', 'deadline-passed'],
    ['2026-11-17T03:00:00.000Z', 'deadline-passed'],
  ])('em %s, o cancelamento retorna %s', (instant, status) => {
    const store = useReservationsStore()
    vi.setSystemTime(new Date('2026-11-13T20:00:00Z'))
    expect(store.confirm(request).status).toBe('confirmed')
    const original = store.reservations[0]!
    vi.setSystemTime(new Date(instant))
    expect(store.cancel(original.id)).toBe(status)
    expect(store.reservations).toHaveLength(1)
    if (status === 'cancelled') {
      expect(store.reservations[0]).toEqual({ ...original, status: 'cancelled', cancelledAt: instant })
      expect(store.findConfirmed(request.travelDate)).toBeUndefined()
    } else {
      expect(store.reservations[0]).toBe(original)
    }
  })

  it('rejeita outro aluno, sessão ausente e cancelamento repetido, sem apagar o registro', async () => {
    const store = useReservationsStore()
    expect(store.confirm(request).status).toBe('confirmed')
    const id = store.reservations[0]!.id
    useSessionStore().user = { id: 'outro-aluno', name: 'Outro aluno', role: 'student' }
    expect(store.cancel(id)).toBe('not-found')
    useSessionStore().user = null
    expect(store.cancel(id)).toBe('not-found')
    await setMockSession('student')
    expect(store.cancel(id)).toBe('cancelled')
    const cancelled = store.reservations[0]
    expect(store.cancel(id)).toBe('already-cancelled')
    expect(store.reservations[0]).toBe(cancelled)
    expect(store.confirm(request).status).toBe('duplicate')
  })

  it('ignora futuras canceladas no aviso da página inicial', () => {
    const store = useReservationsStore()
    vi.setSystemTime(new Date('2026-11-13T20:00:00Z'))
    expect(store.confirm(request).status).toBe('confirmed')
    const id = store.reservations[0]!.id
    expect(store.getHomeSummary('2026-11-13').futureReservation?.id).toBe(id)
    expect(store.cancel(id)).toBe('cancelled')
    expect(store.getHomeSummary('2026-11-13').futureReservation).toBeNull()
    expect(store.getHomeSummary('2026-11-16').currentReservation?.status).toBe('cancelled')
  })
})
