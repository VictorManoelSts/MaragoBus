import { DOMWrapper, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { applyDriverDemoPreference } from '@maragobus/shared/auth/driver-demo'
import { mockAuthService } from '@maragobus/shared/auth/mock'
import { listMockDrivers } from '@maragobus/shared/auth/mock-drivers'
import { authService } from '@maragobus/shared/auth/service'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'
import DriverReservationsPage from '../src/pages/DriverReservationsPage.vue'
import { getMockReservationForm } from '../src/mocks/reservation-form'
import { createPortalRouter } from '../src/router'
import { useCollegeDistributionsStore } from '../src/stores/college-distributions'
import { useWarningRequestsStore } from '../src/stores/warning-requests'
import { useReservationsStore } from '../src/stores/reservations'
import { cpfError } from '../src/utils/cpf'

const date = '2026-11-16'
const credentials = (cpf: string) => ({ cpf, password: 'MotoristaDemo!24' })

function setPreference(query = '') {
  history.replaceState(null, '', '/login' + query)
  applyDriverDemoPreference()
}

beforeEach(() => vi.setSystemTime(new Date('2026-11-17T02:30:00Z')))
afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
  setPreference('?demo-motorista=0')
  history.replaceState(null, '', '/')
})

describe('Cenário demonstrativo do motorista', () => {
  it('exige ativação explícita e remove dados e acesso demonstrativo ao desativar e recarregar', async () => {
    await setMockSession('driver')
    expect(useReservationsStore().listDriverReservations(date)).toEqual([])
    await expect(mockAuthService.login(credentials('90000000418'))).rejects.toThrow()

    setPreference('?demo-motorista=1')
    setActivePinia(createPinia())
    expect(useReservationsStore().countConfirmedByCollege(date).size).toBe(0)
    await setMockSession('driver')
    expect(useReservationsStore().countConfirmedByCollege(date).size).toBe(0)
    await useSessionStore().login(credentials('90000000418'))
    expect(useReservationsStore().countConfirmedByCollege(date).size).toBe(5)
    setPreference('?demo-motorista=0')
    expect(await mockAuthService.restore()).toMatchObject({ id: 'mock-driver-test' })
    await expect(mockAuthService.login(credentials('90000000418'))).rejects.toThrow()
    setActivePinia(createPinia())
    await setMockSession('driver')
    expect(useReservationsStore().listDriverReservations(date)).toEqual([])
  })

  it('carrega 30 reservas no dia civil de Maceió e preserva as validações após o fechamento', async () => {
    setPreference('?demo-motorista=1')
    await setMockSession('student')
    const store = useReservationsStore()
    expect(store.studentReservations).toEqual([])
    expect(store.listDriverReservations(date)).toEqual([])
    expect(store.confirm({
      travelDate: date, context: getMockReservationForm('mock-student-test'), boardingPointId: 'demo-center', closures: [],
    }).status).toBe('unavailable')

    await setMockSession('driver')
    expect(store.listDriverReservations(date)).toEqual([])
    await useSessionStore().login(credentials('90000000418'))
    const reservations = store.listDriverReservations(date)
    expect(reservations).toHaveLength(30)
    expect(new Set(reservations.map(item => item.id)).size).toBe(30)
    expect(new Set(reservations.map(item => item.boardingPointId)).size).toBe(3)
    expect([...store.countConfirmedByCollege(date).values()].sort((a, b) => a - b)).toEqual([2, 4, 6, 8, 10])
    expect(reservations.filter(item => item.studentPhone)).toHaveLength(15)
    expect(store.listDriverReservations('2026-11-17')).toEqual([])

    const wrapper = mount(DriverReservationsPage)
    const college = wrapper.findAll('details').find(item => item.get('summary').text().includes('Faculdade Horizonte'))!
    await college.get('summary').trigger('click')
    await college.get('button').trigger('click')
    expect(new DOMWrapper(document.body).get('dialog[open]').text()).toContain('(00) 90000-0001')
  })

  it('autentica e restaura três motoristas distintos mantendo o opt-in na mesma aba', async () => {
    setPreference('?demo-motorista=1')
    setPreference()
    const catalog = listMockDrivers('driver-demo-1')
    expect(catalog).toHaveLength(3)
    for (const [index, cpf] of ['90000000418', '90000000507', '90000000680'].entries()) {
      expect(cpfError(cpf)).toBe('')
      const driver = await mockAuthService.login(credentials(cpf))
      expect(driver).toMatchObject({ id: `driver-demo-${index + 1}`, role: 'driver' })
      expect(catalog[index]).toEqual(driver)
      expect(await mockAuthService.restore()).toEqual(driver)
      mockAuthService.logout()
    }
  })

  it('ignora a preferência em produção', async () => {
    setPreference('?demo-motorista=1')
    vi.stubEnv('PROD', true)
    expect(listMockDrivers('driver-demo-1')).toEqual([])
    await expect(mockAuthService.login(credentials('90000000418'))).rejects.toThrow()
    expect(useReservationsStore().countConfirmedByCollege(date).size).toBe(0)
  })

  it('isola e reinicia o cenário ao alternar pela navegação interna com as stores já em uso', async () => {
    vi.setSystemTime(new Date('2026-11-16T13:00:00Z'))
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createPortalRouter(createMemoryHistory(), pinia)
    const session = useSessionStore(pinia)
    const reservations = useReservationsStore(pinia)
    const distributions = useCollegeDistributionsStore(pinia)
    const warnings = useWarningRequestsStore(pinia)
    await setMockSession('student')
    const booking = reservations.confirm({
      travelDate: date, context: getMockReservationForm('mock-student-test'),
      boardingPointId: 'demo-center', closures: [],
    })
    expect(booking.status).toBe('confirmed')
    await setMockSession('driver')
    vi.setSystemTime(new Date('2026-11-16T14:00:00Z'))
    await router.push('/motorista/reservas')
    const commonReservations = reservations.listDriverReservations(date)
    expect(commonReservations).toHaveLength(1)
    expect(distributions.assign(date, commonReservations[0]!.college, session.user!, true)).toBe('assigned')
    const commonRecord = distributions.getDistribution(date)

    await router.push('/demo-motorista')
    expect(reservations.listDriverReservations(date)).toEqual(commonReservations)
    expect(listMockDrivers(session.user!.id).map(driver => driver.id)).toEqual(['mock-driver-test'])
    const demo = await session.login(credentials('90000000418'))
    const demoBookings = reservations.listDriverReservations(date)
    expect(demoBookings).toHaveLength(30)
    expect(distributions.getDistribution(date)).toBeUndefined()
    expect(distributions.assign(date, demoBookings[0]!.college, {
      id: 'mock-driver-test', name: 'Motorista de Teste', role: 'driver',
    }, true)).toBe('invalid-driver')
    expect(distributions.assign(date, demoBookings[0]!.college, demo!, true)).toBe('assigned')
    expect(warnings.create(demoBookings[0]!.id, 'Motivo de exemplo').status).toBe('created')
    await router.push('/login?demo-motorista=1')
    expect(reservations.listDriverReservations(date)).toEqual(demoBookings)
    const second = await session.login(credentials('90000000507'))
    expect(distributions.getDistribution(date)?.history).toHaveLength(2)
    expect(warnings.ownRequests).toEqual([])
    expect(second?.id).toBe('driver-demo-2')

    await router.push('/login?demo-motorista=0')
    expect(session.user?.id).toBe('mock-driver-test')
    expect(reservations.listDriverReservations(date)).toEqual(commonReservations)
    expect(distributions.getDistribution(date)).toEqual(commonRecord)
    expect(distributions.assign(date, commonReservations[0]!.college, demo!)).toBe('invalid-driver')
    expect(warnings.create(demoBookings[0]!.id, 'Motivo fora do demo').status).toBe('reservation-unavailable')
    await expect(session.login(credentials('90000000418'))).rejects.toThrow()

    vi.setSystemTime(new Date('2026-11-17T14:00:00Z'))
    await router.push('/login?demo-motorista=1')
    await session.login(credentials('90000000418'))
    expect(reservations.listDriverReservations(date)).toEqual([])
    expect(reservations.listDriverReservations('2026-11-17')).toHaveLength(30)
    expect(distributions.getDistribution(date)).toBeUndefined()
    expect(warnings.ownRequests).toEqual([])
  })

  it('mantém a sessão demonstrativa ao restaurar mesmo quando outra aba altera ou apaga o cookie compartilhado', async () => {
    setPreference('?demo-motorista=1')
    const driver = await authService.login(credentials('90000000418'))
    expect(document.cookie).toBe('')
    document.cookie = 'maragobus_mock_session=mock-admin-test; Path=/'
    setPreference()
    expect(await authService.restore()).toEqual(driver)
    expect(document.cookie).toBe('maragobus_mock_session=mock-admin-test')
    document.cookie = 'maragobus_mock_session=; Path=/; Max-Age=0'
    expect(await authService.restore()).toEqual(driver)
    authService.logout()
    expect(await authService.restore()).toBeNull()
  })
})
