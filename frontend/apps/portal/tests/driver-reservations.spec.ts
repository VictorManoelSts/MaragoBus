import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { authNavigation } from '@maragobus/shared/auth/navigation'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'
import DriverReservationsPage from '../src/pages/DriverReservationsPage.vue'
import { getMockReservationForm } from '../src/mocks/reservation-form'
import { createPortalRouter } from '../src/router'
import { useReservationsStore } from '../src/stores/reservations'

const travelDate = '2026-11-16'
const request = {
  travelDate,
  context: { ...getMockReservationForm(), college: 'Faculdade A' },
  boardingPointId: 'demo-center',
  closures: [],
}

function confirm(name: string, options: Partial<typeof request> = {}, id = name) {
  const session = useSessionStore()
  session.user = { id, name, role: 'student' }
  const result = useReservationsStore().confirm({ ...request, ...options })
  if (result.status !== 'confirmed') throw new Error(result.status)
  return result.reservation
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Consulta de reservas do motorista', () => {
  it.each([
    ['student', '/'],
    ['admin', '/'],
    [null, '/login'],
  ] as const)('protege a rota e a consulta da store para %s', async (role, destination) => {
    await setMockSession('student')
    vi.setSystemTime(new Date('2026-11-16T13:00:00Z'))
    confirm('Ana', {}, 'mock-student-test')
    const store = useReservationsStore()
    if (role) await setMockSession(role)
    else useSessionStore().logout()
    const openExternal = vi.spyOn(authNavigation, 'openExternal').mockImplementation(() => {})
    const router = createPortalRouter(createMemoryHistory())
    await router.push('/motorista/reservas')
    expect(router.currentRoute.value.path).toBe(destination)
    if (role === 'admin') expect(openExternal).toHaveBeenCalledWith('http://localhost:5174/')
    expect(store.listDriverReservations(travelDate)).toEqual([])
    expect(store.studentReservations.map(item => item.studentName)).toEqual(role === 'student' ? ['Ana'] : [])
    expect(store).not.toHaveProperty('reservations')
  })

  it('lista apenas confirmadas da data e combina busca, faculdade e ponto', async () => {
    await setMockSession('student')
    vi.setSystemTime(new Date('2026-11-16T13:00:00Z'))
    confirm('Álvaro Ramos', { boardingPointId: 'demo-south' })
    confirm('Zélia Ramos')
    confirm('Ana Ramos', { context: { ...request.context, college: 'Faculdade B' } })
    confirm('Érica Ramos')
    confirm('Bruno Lima')
    vi.setSystemTime(new Date('2026-11-17T13:00:00Z'))
    confirm('Mariana', { travelDate: '2026-11-17' })
    await setMockSession('driver')
    vi.setSystemTime(new Date('2026-11-17T02:59:59Z'))
    const wrapper = mount(DriverReservationsPage)
    const names = () => wrapper.findAll('li h2').map(heading => heading.text())
    const status = () => wrapper.get('[role="status"]').text()
    const date = wrapper.get('#driver-reservation-date')
    expect((date.element as HTMLInputElement).value).toBe(travelDate)
    expect(names()).toEqual(['Álvaro Ramos', 'Ana Ramos', 'Bruno Lima', 'Érica Ramos', 'Zélia Ramos'])
    expect(wrapper.get('li').text()).toContain('Faculdade A')
    expect(wrapper.get('li').text()).toContain('Bairro Sul')
    expect(wrapper.find('button').exists()).toBe(false)
    await wrapper.get('#driver-reservation-name').setValue('  RAMÓS ')
    await wrapper.get('#driver-reservation-college').setValue('Faculdade A')
    await wrapper.get('#driver-reservation-point').setValue('demo-center')
    expect(names()).toEqual(['Érica Ramos', 'Zélia Ramos'])
    expect(status()).toContain('Total de reservas confirmadas: 5')
    expect(status()).toContain('Resultados filtrados: 2')
    await wrapper.get('#driver-reservation-name').setValue('ausente')
    expect(status()).toContain('Nenhuma reserva corresponde aos filtros selecionados.')
    await wrapper.get('#driver-reservation-name').setValue('')
    await date.setValue('2026-11-17')
    expect(names()).toEqual(['Mariana'])
    await date.setValue('2026-11-18')
    expect(names()).toEqual([])
    expect(status()).toContain('Nenhuma reserva confirmada para esta data.')
    await date.setValue('')
    expect(status()).toContain('Selecione a data da viagem.')
    wrapper.unmount()
  })

  it('reflete confirmações e cancelamentos e entrega somente campos de consulta', async () => {
    await setMockSession('driver')
    vi.setSystemTime(new Date('2026-11-16T13:00:00Z'))
    const wrapper = mount(DriverReservationsPage)
    const store = useReservationsStore()
    expect(wrapper.text()).toContain('Total de reservas confirmadas: 0')
    const ana = confirm('  Ana  ', {}, 'mock-student-test')
    confirm('Bruno')
    await setMockSession('driver')
    expect(wrapper.text()).toContain('Total de reservas confirmadas: 2')
    expect(wrapper.findAll('li h2').map(heading => heading.text())).toEqual(['Ana', 'Bruno'])
    expect(store.listDriverReservations(travelDate)).toContainEqual({
      id: ana.id, studentName: 'Ana', college: 'Faculdade A',
      boardingPointId: 'demo-center', boardingPoint: ana.boardingPoint,
    })
    expect(Object.isFrozen(store.listDriverReservations(travelDate)[0])).toBe(true)
    expect(store.studentReservations).toEqual([])
    expect(store.confirm(request).status).toBe('student-required')
    expect(store.cancel(ana.id)).toBe('not-found')
    await setMockSession('student')
    expect(store.cancel(ana.id)).toBe('cancelled')
    await setMockSession('driver')
    expect(wrapper.text()).toContain('Total de reservas confirmadas: 1')
    expect(wrapper.findAll('li h2').map(heading => heading.text())).toEqual(['Bruno'])
    useSessionStore().user = null
    await nextTick()
    expect(wrapper.text()).toContain('Total de reservas confirmadas: 0')
    wrapper.unmount()
  })
})
