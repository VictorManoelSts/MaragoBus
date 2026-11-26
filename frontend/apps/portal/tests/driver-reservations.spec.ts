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

  it('agrupa confirmadas por faculdade, inicia recolhido e ordena alunos alfabeticamente', async () => {
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
    const groups = () => wrapper.get('section[aria-labelledby="driver-reservations-by-college"]').findAll('details')
    const indicators = () => wrapper.findAll('[role="status"] dd').map(value => value.text())
    const list = wrapper.get('section[aria-labelledby="driver-reservations-by-college"]')
    const date = wrapper.get('#driver-reservation-date')
    expect((date.element as HTMLInputElement).value).toBe(travelDate)
    expect(groups()).toHaveLength(2)
    expect(groups().every(group => !group.element.open)).toBe(true)
    expect(groups()[0]!.findAll('summary span.block').map(span => span.text())).toEqual(['Faculdade A', '4 reservas confirmadas'])
    expect(groups()[1]!.findAll('summary span.block').map(span => span.text())).toEqual(['Faculdade B', '1 reserva confirmada'])
    const first = groups()[0]!
    await first.get('summary').trigger('click')
    expect(first.element.open).toBe(true)
    expect(groups()[1]!.element.open).toBe(false)
    expect(first.findAll('button strong').map(name => name.text()))
      .toEqual(['Álvaro Ramos', 'Bruno Lima', 'Érica Ramos', 'Zélia Ramos'])
    const row = first.get('button')
    expect(row.text()).toContain('Bairro Sul')
    expect(row.attributes('type')).toBe('button')
    expect(row.attributes('aria-haspopup')).toBe('dialog')
    expect(row.findAll('svg').map(icon => icon.attributes('aria-hidden'))).toEqual(['true', 'true'])
    expect(indicators()).toEqual(['5', '2'])
    await date.setValue('2026-11-17')
    expect(groups()).toHaveLength(1)
    expect(groups()[0]!.element.open).toBe(false)
    expect(groups()[0]!.get('button strong').text()).toBe('Mariana')
    await date.setValue('2026-11-18')
    expect(groups()).toHaveLength(0)
    expect(list.get('.mb-card [role="status"]').text()).toBe('Nenhuma reserva confirmada para esta data.')
    expect(indicators()).toEqual(['0', '0'])
    await date.setValue('')
    expect(list.get('.mb-card [role="status"]').text()).toBe('Selecione a data da viagem.')
    expect(indicators()).toEqual(['0', '0'])
    wrapper.unmount()
  })

  it('atualiza o aviso de encerramento às 11h no horário de Maceió', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-16T13:59:59Z'))
    await setMockSession('driver')
    const wrapper = mount(DriverReservationsPage)
    const section = wrapper.get('section[aria-labelledby="driver-route-organization"]')
    expect(section.text()).toContain('Organização de rotas')
    expect(section.text()).toContain('estará disponível após o encerramento das reservas')
    await vi.advanceTimersByTimeAsync(1_000)
    expect(section.text()).toContain('Nenhuma reserva confirmada para esta data.')
    const date = wrapper.get('#driver-reservation-date')
    await date.setValue('2026-11-17')
    expect(section.get('[role="status"]').text()).toContain('A data selecionada é futura')
    await date.setValue('2026-11-13')
    expect(section.get('[role="status"]').text()).toContain('A data selecionada já passou')
    await date.setValue('')
    expect(section.get('[role="status"]').text()).toContain('Selecione a data da viagem')
    wrapper.unmount()
  })

  it('reflete confirmações e cancelamentos e entrega somente campos de consulta', async () => {
    await setMockSession('driver')
    vi.setSystemTime(new Date('2026-11-16T13:00:00Z'))
    const wrapper = mount(DriverReservationsPage)
    const store = useReservationsStore()
    expect(wrapper.findAll('[role="status"] dd').map(value => value.text())).toEqual(['0', '0'])
    const ana = confirm('  Ana  ', {}, 'mock-student-test')
    confirm('Bruno')
    await setMockSession('driver')
    expect(wrapper.findAll('[role="status"] dd').map(value => value.text())).toEqual(['2', '1'])
    expect(wrapper.findAll('details button strong').map(name => name.text())).toEqual(['Ana', 'Bruno'])
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
    expect(wrapper.findAll('[role="status"] dd').map(value => value.text())).toEqual(['1', '1'])
    expect(wrapper.findAll('details button strong').map(name => name.text())).toEqual(['Bruno'])
    useSessionStore().user = null
    await nextTick()
    expect(wrapper.findAll('[role="status"] dd').map(value => value.text())).toEqual(['0', '0'])
    wrapper.unmount()
  })
})
