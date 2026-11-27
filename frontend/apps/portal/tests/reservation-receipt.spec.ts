import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createMemoryHistory } from 'vue-router'
import { authNavigation } from '@maragobus/shared/auth/navigation'
import { selectStudentDemo } from '@maragobus/shared/auth/student-demo'
import { useSessionStore } from '@maragobus/shared/auth/session'
import App from '../src/App.vue'
import { getMockReservationForm } from '../src/mocks/reservation-form'
import { createPortalRouter } from '../src/router'
import { useReservationsStore } from '../src/stores/reservations'
import { getReceiptAvailability } from '../src/utils/reservation-receipt'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'

const travelDate = '2026-11-17'

function clock(instant: string) {
  vi.setSystemTime(new Date(instant))
}

function confirm(date = travelDate) {
  clock(`${date}T13:00:00Z`)
  const store = useReservationsStore()
  const confirmed = store.confirm({
    travelDate: date, boardingPointId: 'demo-center', closures: [],
    context: getMockReservationForm('mock-student-test'),
  })
  if (confirmed.status !== 'confirmed') throw new Error('Falha na reserva de teste')
  return confirmed.reservation.id
}

async function page(path = '/comprovante') {
  const router = createPortalRouter(createMemoryHistory())
  await router.push(path)
  await router.isReady()
  return { router, wrapper: mount(App, { global: { plugins: [router] } }) }
}

describe('Comprovante de reserva', () => {
  beforeEach(async () => { await setMockSession('student') })
  afterEach(() => {
    selectStudentDemo(null)
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it.each([
    ['2026-11-17T02:59:59.999Z', 'future'],
    ['2026-11-17T03:00:00.000Z', 'available'],
    ['2026-11-17T20:00:00.000Z', 'available'],
    ['2026-11-18T02:59:59.999Z', 'available'],
    ['2026-11-18T03:00:00.000Z', 'unavailable'],
  ])('em %s calcula %s no fuso de Maceió', (instant, state) => {
    expect(getReceiptAvailability({ travelDate, status: 'confirmed' }, new Date(instant))).toBe(state)
    expect(getReceiptAvailability({ travelDate, status: 'cancelled' }, new Date(instant))).toBe('unavailable')
  })

  it.each(['/', '/reservas'])('navega de %s para a página exclusiva', async path => {
    confirm()
    const { router, wrapper } = await page(path)
    await wrapper.get('main a[href="/comprovante"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/comprovante'))
    const main = wrapper.get('main')
    expect(main.get('h1').text()).toBe('Comprovante')
    expect(main.get('img').attributes('alt')).toBe('MaragoBus')
    expect(main.get('time').attributes('datetime')).toBe(travelDate)
    expect(main.text()).toContain('Reserva confirmada')
    expect(main.text()).toContain('Comprovante demonstrativo — sem validade para embarque')
    expect(main.findAll('dd').map(item => item.text())).toEqual([
      'Aluno de Teste', 'Faculdade de Demonstração', 'Praça de exemplo — Centro',
    ])
    expect(main.find('dialog').exists()).toBe(false)
  })

  it('preserva o comprovante após as 17h e troca para o próximo somente à meia-noite', async () => {
    confirm()
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    clock('2026-11-17T19:59:59.999Z')
    const { wrapper } = await page()
    const main = wrapper.get('main')
    vi.advanceTimersByTime(1)
    await nextTick()
    expect(main.get('time').attributes('datetime')).toBe(travelDate)

    expect(useReservationsStore().confirm({
      travelDate: '2026-11-18', boardingPointId: 'demo-south', closures: [],
      context: getMockReservationForm('mock-student-test'),
    }).status).toBe('confirmed')
    await nextTick()
    expect(main.get('time').attributes('datetime')).toBe(travelDate)
    expect(main.text()).toContain('Praça de exemplo — Centro')

    clock('2026-11-18T02:59:59.999Z')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(main.get('time').attributes('datetime')).toBe(travelDate)
    vi.advanceTimersByTime(1)
    await nextTick()
    expect(main.get('time').attributes('datetime')).toBe('2026-11-18')
    expect(main.text()).not.toContain('Praça de exemplo — Centro')
  })

  it('informa a liberação futura, exibe o comprovante na virada e o retira ao expirar', async () => {
    confirm()
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    clock('2026-11-17T02:59:59.999Z')
    const { wrapper } = await page()
    const main = wrapper.get('main')
    const status = main.get('.sr-only[role="status"]')
    expect(status.text()).toBe('')
    expect(main.text()).toContain('17/11/2026 às 00h (horário de Alagoas)')
    expect(main.find('dl').exists()).toBe(false)
    vi.advanceTimersByTime(1)
    await nextTick()
    expect(main.find('dl').exists()).toBe(true)
    expect(status.text()).toBe('Comprovante disponível para 17/11/2026.')
    clock('2026-11-18T02:59:00.000Z')
    vi.advanceTimersByTime(60_000)
    await nextTick()
    expect(main.text()).toContain('Você não tem reservas para hoje')
    expect(main.find('dl, time').exists()).toBe(false)
    expect(status.text()).toContain('Você não tem reservas para hoje')
  })

  it('revalida ao seguir um link desatualizado depois da virada do dia', async () => {
    confirm()
    const { router, wrapper } = await page()
    await router.push('/')
    const link = wrapper.get('main a[href="/comprovante"]')
    clock('2026-11-18T03:00:00Z')
    await link.trigger('click')
    await flushPromises()
    expect(wrapper.get('main').text()).toContain('Você não tem reservas para hoje')
    expect(wrapper.find('main dd').exists()).toBe(false)
  })

  it('isola os dados ao trocar de aluno e retira os detalhes após cancelamento', async () => {
    const id = confirm()
    const store = useReservationsStore()
    const { wrapper } = await page('/comprovante?id=' + id)
    const main = wrapper.get('main')
    expect(main.find('dl').exists()).toBe(true)

    useSessionStore().user = { id: 'outro-aluno', name: 'Outro aluno', role: 'student' }
    await nextTick()
    expect(store.getReceiptReservation(id, new Date())).toBeUndefined()
    expect(main.text()).toContain('Você não tem reservas para hoje')
    expect(main.find('dl').exists()).toBe(false)

    await setMockSession('student')
    await flushPromises()
    expect(main.text()).toContain('Aluno de Teste')
    expect(store.cancel(id)).toBe('cancelled')
    await nextTick()
    expect(store.getReceiptReservation(id, new Date())).toBeUndefined()
    expect(main.text()).toContain('A reserva de 17/11/2026 foi cancelada')
    expect(main.find('dl').exists()).toBe(false)
  })

  it('distingue o cancelamento futuro de uma conta sem reservas', async () => {
    const id = confirm()
    clock('2026-11-17T02:59:00Z')
    expect(useReservationsStore().cancel(id)).toBe('cancelled')
    const { wrapper } = await page()
    expect(wrapper.get('main').text()).toContain('A reserva de 17/11/2026 foi cancelada')
    expect(wrapper.find('main dl').exists()).toBe(false)
  })

  it.each(['anonymous', 'driver'] as const)('protege a rota contra %s', async role => {
    confirm()
    const session = useSessionStore()
    if (role === 'anonymous') await session.logout()
    else await setMockSession(role)
    const { router, wrapper } = await page()
    expect(router.currentRoute.value.path).toBe(role === 'driver' ? '/motorista/reservas' : '/login')
    expect(wrapper.text()).not.toContain('Comprovante demonstrativo')
  })

  it('bloqueia o comprovante para o administrador e o encaminha ao Admin', async () => {
    const { router, wrapper } = await page('/')
    const openExternal = vi.spyOn(authNavigation, 'openExternal').mockImplementation(() => {})
    await setMockSession('admin')
    await router.push('/comprovante')
    expect(router.currentRoute.value.path).toBe('/')
    expect(openExternal).toHaveBeenCalledWith('http://localhost:5174/')
    expect(wrapper.find('main').exists()).toBe(false)
  })

  it.each([
    ['prazo-encerrado', 'Comprovante demonstrativo'],
    ['cancelada', 'foi cancelada'],
    ['sem-reserva', 'Você não tem reservas para hoje'],
  ])('apresenta o cenário demonstrativo %s', async (scenario, message) => {
    const { router, wrapper } = await page(`/demo-aluno?cenario=${scenario}`)
    await useSessionStore().login({ cpf: '90000000175', password: 'AlunoTeste!53' })
    await router.push('/comprovante')
    expect(wrapper.get('main').text()).toContain(message)
  })
})
