import { DOMWrapper, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyDriverDemoPreference } from '@maragobus/shared/auth/driver-demo'
import { mockAuthService } from '@maragobus/shared/auth/mock'
import { authService } from '@maragobus/shared/auth/service'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'
import DriverReservationsPage from '../src/pages/DriverReservationsPage.vue'
import { getMockReservationForm } from '../src/mocks/reservation-form'
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
    expect(useReservationsStore().countConfirmedByCollege(date).size).toBe(5)
    await mockAuthService.login(credentials('90000000418'))
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
    for (const [index, cpf] of ['90000000418', '90000000507', '90000000680'].entries()) {
      expect(cpfError(cpf)).toBe('')
      const driver = await mockAuthService.login(credentials(cpf))
      expect(driver).toMatchObject({ id: `driver-demo-${index + 1}`, role: 'driver' })
      expect(await mockAuthService.restore()).toEqual(driver)
      mockAuthService.logout()
    }
  })

  it('ignora a preferência em produção', async () => {
    setPreference('?demo-motorista=1')
    vi.stubEnv('PROD', true)
    await expect(mockAuthService.login(credentials('90000000418'))).rejects.toThrow()
    expect(useReservationsStore().countConfirmedByCollege(date).size).toBe(0)
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
