import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed } from 'vue'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'
import { getMockReservationForm } from '../src/mocks/reservation-form'
import { useReservationsStore } from '../src/stores/reservations'
import { useCollegeDistributionsStore } from '../src/stores/college-distributions'

const travelDate = '2026-11-16'

function confirmReservation(college: string, id: string) {
  const session = useSessionStore()
  session.user = { id, name: `Aluno ${id}`, role: 'student' }
  const result = useReservationsStore().confirm({
    travelDate,
    context: { ...getMockReservationForm(id), college },
    boardingPointId: 'demo-center',
    closures: [],
  })
  if (result.status !== 'confirmed') throw new Error(result.status)
  return result.reservation
}

async function seedReservations() {
  await setMockSession('student')
  confirmReservation('Faculdade A', 'aluno-a')
  confirmReservation('Faculdade A', 'aluno-b')
  confirmReservation('Faculdade B', 'aluno-c')
  await setMockSession('driver')
}

describe('Store da distribuição de faculdades', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-16T13:00:00.000Z'))
    await seedReservations()
    vi.setSystemTime(new Date('2026-11-16T14:00:00.000Z'))
  })

  afterEach(() => vi.useRealTimers())

  it('cria uma distribuição compartilhada por data e recusa duplicidade', () => {
    const store = useCollegeDistributionsStore()
    expect(store.create(travelDate)).toBe('created')
    expect(store.create(travelDate)).toBe('already-exists')
    expect(store.getDistribution(travelDate)).toMatchObject({
      travelDate, status: 'RASCUNHO', totalStudents: 3,
      colleges: [
        { college: 'Faculdade A', studentCount: 2, driver: null },
        { college: 'Faculdade B', studentCount: 1, driver: null },
      ],
      history: [{ type: 'created', author: { id: 'mock-driver-test' }, at: '2026-11-16T14:00:00.000Z' }],
    })
  })

  it('permite alterações apenas a motoristas e entre 11h e meia-noite em Maceió', async () => {
    const store = useCollegeDistributionsStore()
    vi.setSystemTime(new Date('2026-11-16T13:59:59.999Z'))
    expect(store.create(travelDate)).toBe('outside-window')
    vi.setSystemTime(new Date('2026-11-16T14:00:00.000Z'))
    expect(store.create(travelDate)).toBe('created')
    await setMockSession('student')
    expect(store.assign(travelDate, 'Faculdade A', { id: 'driver-a', name: 'A', role: 'driver' })).toBe('driver-required')
    await setMockSession('admin')
    expect(store.publish(travelDate)).toBe('driver-required')
    useSessionStore().user = null
    expect(store.reopen(travelDate)).toBe('driver-required')
    await setMockSession('driver')
    vi.setSystemTime(new Date('2026-11-17T02:59:59.999Z'))
    expect(store.assign(travelDate, 'Faculdade A', { id: 'driver-a', name: 'Motorista A', role: 'driver' })).toBe('assigned')
    vi.setSystemTime(new Date('2026-11-17T03:00:00.000Z'))
    expect(store.remove(travelDate, 'Faculdade A')).toBe('outside-window')
  })

  it('atribui, remove e transfere faculdades sem duplicar motoristas', () => {
    const store = useCollegeDistributionsStore()
    const driverA = { id: 'driver-a', name: 'Motorista A', role: 'driver' as const }
    const driverB = { id: 'driver-b', name: 'Motorista B', role: 'driver' as const }
    store.create(travelDate)
    expect(store.assign(travelDate, 'Faculdade ausente', driverA)).toBe('college-not-found')
    expect(store.assign(travelDate, 'Faculdade A', driverA)).toBe('assigned')
    expect(store.assign(travelDate, 'Faculdade A', driverB)).toBe('already-assigned')
    expect(store.transfer(travelDate, 'Faculdade A', driverA)).toBe('same-driver')
    expect(store.transfer(travelDate, 'Faculdade A', driverB)).toBe('transferred')
    expect(store.remove(travelDate, 'Faculdade A')).toBe('removed')
    expect(store.remove(travelDate, 'Faculdade A')).toBe('not-assigned')
    expect(store.getDistribution(travelDate)?.colleges[0]?.driver).toBeNull()
  })

  it('publica apenas com todas as faculdades atribuídas e permite reabrir no mesmo dia', () => {
    const store = useCollegeDistributionsStore()
    const driver = { id: 'driver-a', name: 'Motorista A', role: 'driver' as const }
    store.create(travelDate)
    expect(store.publish(travelDate)).toBe('unassigned-colleges')
    store.assign(travelDate, 'Faculdade A', driver)
    store.assign(travelDate, 'Faculdade B', driver)
    expect(store.publish(travelDate)).toBe('published')
    expect(store.getDistribution(travelDate)?.status).toBe('PUBLICADA')
    expect(store.assign(travelDate, 'Faculdade A', driver)).toBe('not-draft')
    expect(store.reopen(travelDate)).toBe('reopened')
    expect(store.getDistribution(travelDate)?.status).toBe('RASCUNHO')
  })

  it('publica data vazia sem rascunho na janela e preserva autorização e histórico', async () => {
    const store = useCollegeDistributionsStore()
    const emptyDate = '2026-11-17'
    vi.setSystemTime(new Date('2026-11-17T13:59:59.999Z'))
    expect(store.publish(emptyDate)).toBe('outside-window')
    vi.setSystemTime(new Date('2026-11-17T14:00:00.000Z'))
    await setMockSession('student')
    expect(store.publish(emptyDate)).toBe('driver-required')
    await setMockSession('driver')
    expect(store.getDistribution(emptyDate)).toBeUndefined()
    expect(store.publish(travelDate)).toBe('outside-window')
    expect(store.publish(emptyDate)).toBe('published')
    expect(store.publish(emptyDate)).toBe('not-draft')
    expect(store.getDistribution(emptyDate)?.history.map(change => change.type)).toEqual(['created', 'published'])
    vi.setSystemTime(new Date('2026-11-18T03:00:00.000Z'))
    expect(store.publish(emptyDate)).toBe('outside-window')
    expect(store.reopen(emptyDate)).toBe('outside-window')
    expect(store.getDistribution(emptyDate)?.status).toBe('PUBLICADA')
    expect(store.publish('2026-11-18')).toBe('outside-window')
  })

  it('atualiza quantidades reativamente após cancelamento e mantém a atribuição', () => {
    const distributions = useCollegeDistributionsStore()
    const reservations = useReservationsStore()
    const driver = { id: 'driver-a', name: 'Motorista A', role: 'driver' as const }
    distributions.create(travelDate)
    distributions.assign(travelDate, 'Faculdade A', driver)
    distributions.assign(travelDate, 'Faculdade B', driver)
    distributions.publish(travelDate)
    const distribution = computed(() => distributions.getDistribution(travelDate))
    expect(distribution.value?.colleges[0]).toMatchObject({
      studentCount: 2, driver: { id: driver.id, name: driver.name },
    })
    useSessionStore().user = { id: 'aluno-a', name: 'Aluno aluno-a', role: 'student' }
    expect(reservations.cancel(reservations.studentReservations[0]!.id)).toBe('cancelled')
    expect(distribution.value).toBeUndefined()
    useSessionStore().user = driver
    expect(distribution.value?.colleges[0]).toMatchObject({
      studentCount: 1, driver: { id: driver.id, name: driver.name },
    })
    useSessionStore().user = { id: 'aluno-b', name: 'Aluno aluno-b', role: 'student' }
    expect(reservations.cancel(reservations.studentReservations[0]!.id)).toBe('cancelled')
    expect(distribution.value).toBeUndefined()
    useSessionStore().user = driver
    expect(distribution.value).toMatchObject({ status: 'PUBLICADA', totalStudents: 1 })
    expect(distribution.value?.colleges).toContainEqual({
      college: 'Faculdade A', studentCount: 0, driver: { id: driver.id, name: driver.name },
    })
  })

  it('protege as consultas por papel e restaura o acesso compartilhado entre motoristas', async () => {
    const distributions = useCollegeDistributionsStore()
    const reservations = useReservationsStore()
    const session = useSessionStore()
    const driver = { id: 'driver-a', name: 'Motorista A', role: 'driver' as const }
    expect(distributions.assign(travelDate, 'Faculdade A', driver, true)).toBe('assigned')
    const distribution = computed(() => distributions.getDistribution(travelDate))
    const counts = computed(() => reservations.countConfirmedByCollege(travelDate))
    const expectedDistribution = distribution.value
    const expectedCounts = new Map([['Faculdade A', 2], ['Faculdade B', 1]])
    expect(expectedDistribution).toMatchObject({ status: 'RASCUNHO', totalStudents: 3 })
    expect(counts.value).toEqual(expectedCounts)

    const expectDenied = () => {
      expect(distribution.value).toBeUndefined()
      expect(counts.value.size).toBe(0)
    }

    session.logout()
    expectDenied()
    await setMockSession('student')
    expectDenied()
    await setMockSession('admin')
    expectDenied()

    session.user = { id: 'driver-b', name: 'Motorista B', role: 'driver' }
    expect(distribution.value).toEqual(expectedDistribution)
    expect(counts.value).toEqual(expectedCounts)
  })

  it('preserva histórico com autor, instante e natureza da alteração', () => {
    const store = useCollegeDistributionsStore()
    const driverA = { id: 'driver-a', name: 'Motorista A', role: 'driver' as const }
    const driverB = { id: 'driver-b', name: 'Motorista B', role: 'driver' as const }
    store.create(travelDate)
    store.assign(travelDate, 'Faculdade A', driverA)
    vi.setSystemTime(new Date('2026-11-16T15:00:00.000Z'))
    store.transfer(travelDate, 'Faculdade A', driverB)
    const history = store.getDistribution(travelDate)?.history
    expect(history?.map(item => item.type)).toEqual(['created', 'assigned', 'transferred'])
    expect(history?.every(item => item.author.id === 'mock-driver-test' && Number.isFinite(Date.parse(item.at)))).toBe(true)
    expect(history?.[2]).toMatchObject({ at: '2026-11-16T15:00:00.000Z' })
  })

  it('reconhece o mesmo estado da store por dois motoristas e protege datas anteriores', async () => {
    const store = useCollegeDistributionsStore()
    store.create(travelDate)
    await setMockSession('driver')
    useSessionStore().user = { id: 'outro-motorista', name: 'Outro motorista', role: 'driver' }
    expect(store.getDistribution(travelDate)?.travelDate).toBe(travelDate)
    expect(store.assign(travelDate, 'Faculdade A', { id: 'outro-motorista', name: 'Outro motorista', role: 'driver' })).toBe('assigned')
    expect(store.getDistribution(travelDate)?.history.map(change => change.author.id))
      .toEqual(['mock-driver-test', 'outro-motorista'])
    vi.setSystemTime(new Date('2026-11-17T14:00:00.000Z'))
    expect(store.remove(travelDate, 'Faculdade A')).toBe('outside-window')
    expect(store.getDistribution(travelDate)?.colleges[0]?.driver?.id).toBe('outro-motorista')
  })
})
