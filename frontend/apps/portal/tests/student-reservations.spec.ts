import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { selectStudentDemo } from '@maragobus/shared/auth/student-demo'
import { useSessionStore } from '@maragobus/shared/auth/session'
import App from '../src/App.vue'
import HomePage from '../src/pages/HomePage.vue'
import { getMockReservationForm } from '../src/mocks/reservation-form'
import { createPortalRouter } from '../src/router'
import { useReservationsStore } from '../src/stores/reservations'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'

const reference = new Date('2026-11-18T02:59:59Z')

function confirm(date: string, college = 'Faculdade de teste') {
  vi.setSystemTime(new Date(`${date}T13:00:00Z`))
  const result = useReservationsStore().confirm({
    travelDate: date, boardingPointId: 'demo-center', closures: [],
    context: { ...getMockReservationForm(), college },
  })
  expect(result.status).toBe('confirmed')
}

async function page(path = '/reservas') {
  const router = createPortalRouter(createMemoryHistory())
  await router.push(path)
  await router.isReady()
  return { router, wrapper: mount(App, { attachTo: document.body, global: { plugins: [router] } }) }
}

function cancellationDialog() {
  return new DOMWrapper(document.body).get('dialog[open]')
}

describe('Minhas reservas', () => {
  beforeEach(async () => {
    await setMockSession('student')
    vi.setSystemTime(reference)
  })
  afterEach(() => {
    selectStudentDemo(null)
    vi.useRealTimers()
  })

  it('mostra o estado vazio, explica a demonstração e oferece acesso a Fazer reserva', async () => {
    const { router, wrapper } = await page()
    expect(wrapper.get('main').text()).toContain('até recarregar')
    expect(wrapper.get('main').text()).toContain('Você ainda não tem reservas.')
    await wrapper.get('input[value="confirmed"]').setValue()
    expect(wrapper.get('main [role="status"]').text()).toBe('Você não tem reservas confirmadas.')
    await wrapper.get('input[value="cancelled"]').setValue()
    expect(wrapper.get('main [role="status"]').text()).toBe('Você não tem reservas canceladas.')
    await wrapper.get('input[value="all"]').setValue()
    await wrapper.get('main a').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/'))
  })

  it('prioriza hoje, ordena futuras e anteriores pela proximidade e conserva o status', async () => {
    const dates = ['2026-11-19', '2026-11-13', '2026-11-17', '2026-11-18', '2026-11-16']
    dates.forEach(date => confirm(date))
    vi.setSystemTime(reference)
    const { wrapper } = await page()
    expect(wrapper.findAll('main h2').map(title => title.text())).toEqual(['Hoje', 'Futuras', 'Anteriores'])
    expect(wrapper.findAll('main time').map(time => time.attributes('datetime'))).toEqual([
      '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-16', '2026-11-13',
    ])
    expect(wrapper.get('main time').text()).toBe('17/11/2026')
    expect(wrapper.get('main li').text()).toContain('Faculdade de teste')
    expect(wrapper.get('main li').text()).toContain('Praça de exemplo — Centro')
    expect(wrapper.findAll('main li').every(item => item.text().includes('Confirmada'))).toBe(true)
    expect(useReservationsStore().studentReservations.map(item => item.travelDate)).toEqual(dates)
    vi.setSystemTime(new Date('2026-11-18T03:00:00Z'))
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(wrapper.get('main time').attributes('datetime')).toBe('2026-11-18')
  })

  it('oferece três rádios nativos rotulados e exibe apenas os status selecionados', async () => {
    confirm('2026-11-17')
    confirm('2026-11-18')
    expect(useReservationsStore().cancel(useReservationsStore().findConfirmed('2026-11-18')!.id)).toBe('cancelled')
    vi.setSystemTime(reference)
    const { wrapper } = await page()
    const group = wrapper.get('main fieldset')
    const radios = group.findAll<HTMLInputElement>('input[type="radio"]')
    expect(group.get('legend').text()).toBe('Filtrar reservas por situação')
    expect(group.findAll('label').map(label => label.text())).toEqual(['Todas', 'Confirmadas', 'Canceladas'])
    expect(radios.map(radio => radio.element.name)).toEqual(Array(3).fill('reservation-status'))
    expect(radios.map(radio => radio.element.checked)).toEqual([true, false, false])
    radios[0]!.element.focus()
    expect(document.activeElement).toBe(radios[0]!.element)
    expect(wrapper.find('main select').exists()).toBe(false)
    expect(wrapper.findAll('main li')).toHaveLength(2)

    await group.get('input[value="confirmed"]').setValue()
    expect(radios.map(radio => radio.element.checked)).toEqual([false, true, false])
    expect(wrapper.get('main li .mb-feedback--success').text()).toBe('Confirmada')
    expect(wrapper.findAll('main li')).toHaveLength(1)

    await group.get('input[value="cancelled"]').setValue()
    expect(radios.map(radio => radio.element.checked)).toEqual([false, false, true])
    expect(wrapper.get('main li .mb-feedback--danger').text()).toBe('Cancelada')
    expect(wrapper.findAll('main li')).toHaveLength(1)

    await group.get('input[value="all"]').setValue()
    expect(wrapper.findAll('main li')).toHaveLength(2)
  })

  it('oferece o comprovante apenas na reserva confirmada de hoje e acompanha a meia-noite', async () => {
    confirm('2026-11-13')
    confirm('2026-11-17')
    confirm('2026-11-18')
    vi.setSystemTime(reference)
    const { wrapper } = await page()
    const links = 'main a[href="/comprovante"]'
    expect(wrapper.get('#reservations-today').text()).toBe('Hoje')
    expect(wrapper.findAll(links)).toHaveLength(1)
    expect(wrapper.get('section[aria-labelledby="reservations-today"] a[href="/comprovante"]').text()).toBe('Ver comprovante')
    expect(wrapper.get('section[aria-labelledby="reservations-future"]').text()).toContain('a partir das 00h')

    vi.setSystemTime(new Date('2026-11-18T03:00:00Z'))
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(wrapper.findAll(links)).toHaveLength(1)
    expect(wrapper.get('section[aria-labelledby="reservations-today"] time').attributes('datetime')).toBe('2026-11-18')
    const store = useReservationsStore()
    expect(store.cancel(store.findConfirmed('2026-11-18')!.id)).toBe('cancelled')
    await flushPromises()
    expect(wrapper.find(links).exists()).toBe(false)
    expect(wrapper.get('section[aria-labelledby="reservations-today"]').text()).toContain('Cancelada')
  })

  it('renderiza o histórico demonstrativo completo e filtra a reserva cancelada', async () => {
    vi.setSystemTime(new Date('2026-11-16T13:00:00Z'))
    const { router, wrapper } = await page('/demo-aluno?cenario=completo')
    await useSessionStore().login({ cpf: '90000000175', password: 'AlunoTeste!53' })
    await router.push('/reservas')
    expect(wrapper.findAll('main time').map(time => time.attributes('datetime'))).toEqual([
      '2026-11-16', '2026-11-17', '2026-11-13', '2026-11-12',
    ])
    await wrapper.get('input[value="confirmed"]').setValue()
    expect(wrapper.findAll('main li')).toHaveLength(3)
    await wrapper.get('input[value="cancelled"]').setValue()
    expect(wrapper.findAll('main li')).toHaveLength(1)
    expect(wrapper.get('main time').attributes('datetime')).toBe('2026-11-12')
  })

  it('acompanha novas confirmações e apresenta apenas as reservas da sessão atual', async () => {
    const { wrapper } = await page()
    confirm('2026-11-17', 'Faculdade do primeiro aluno')
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(wrapper.get('main').text()).toContain('Faculdade do primeiro aluno')
    await wrapper.get('main li button').trigger('click')
    expect(cancellationDialog().get('time').attributes('datetime')).toBe('2026-11-17')
    useSessionStore().user = { id: 'outro-aluno', name: 'Outro aluno', role: 'student' }
    await flushPromises()
    expect(wrapper.get('main').text()).toContain('Você ainda não tem reservas.')
    expect(wrapper.get('main').text()).not.toContain('Faculdade do primeiro aluno')
    expect(document.querySelector('dialog[open]')).toBeNull()
    expect(wrapper.find('main a[href="/comprovante"]').exists()).toBe(false)
    confirm('2026-11-17', 'Faculdade do segundo aluno')
    await flushPromises()
    expect(wrapper.get('main').text()).toContain('Faculdade do segundo aluno')
    expect(wrapper.findAll('main time')).toHaveLength(1)
  })

  it('mostra em Minhas reservas a confirmação feita na página inicial', async () => {
    vi.setSystemTime(new Date('2026-11-17T13:00:00Z'))
    const { router, wrapper } = await page('/')
    await wrapper.get('main select').setValue('demo-south')
    await wrapper.get('main form').trigger('submit')
    await router.push({ name: 'reservations' })
    await flushPromises()
    expect(wrapper.get('main h2').text()).toBe('Hoje')
    expect(wrapper.get('main li').text()).toContain('Parada de exemplo — Bairro Sul')
    expect(wrapper.findAll('main time')).toHaveLength(1)
  })

  it('pede confirmação no modal e atualiza a listagem e a página inicial em memória', async () => {
    confirm('2026-11-17')
    vi.setSystemTime(new Date('2026-11-17T18:00:00Z'))
    const { router, wrapper } = await page()
    const home = mount(HomePage, { global: { plugins: [router] } })
    expect(home.get('section').text()).toContain('Confirmada')
    await wrapper.get('input[value="confirmed"]').setValue()
    const opener = wrapper.get<HTMLButtonElement>('main li button')
    opener.element.focus()
    await opener.trigger('click')
    expect(cancellationDialog().get('time').attributes('datetime')).toBe('2026-11-17')
    await cancellationDialog().get('footer button').trigger('click')
    expect(document.querySelector('dialog[open]')).toBeNull()
    expect(document.activeElement).toBe(opener.element)
    expect(useReservationsStore().studentReservations[0]?.status).toBe('confirmed')
    await opener.trigger('click')
    await cancellationDialog().get('footer button:last-child').trigger('click')
    expect(document.querySelector('dialog[open]')).toBeNull()
    expect(wrapper.get('main [role="status"]').text()).toContain('Reserva de demonstração cancelada.')
    expect(opener.element.isConnected).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('main [role="status"] p').element)
    expect(wrapper.find('main li').exists()).toBe(false)
    expect(wrapper.text()).toContain('Você não tem reservas confirmadas.')
    expect(wrapper.find('main button').exists()).toBe(false)
    expect(home.get('section').text()).toContain('Cancelada')
    await wrapper.get('input[value="cancelled"]').setValue()
    expect(wrapper.get('main li').text()).toContain('Cancelada')
    expect(wrapper.get('main li').text()).toContain('Faculdade de teste')
  })

  it('revalida no modal ao confirmar exatamente às 16h com o relógio da tela desatualizado', async () => {
    confirm('2026-11-17')
    vi.setSystemTime(new Date('2026-11-17T18:59:59Z'))
    const { wrapper } = await page()
    await wrapper.get('main button').trigger('click')
    vi.setSystemTime(new Date('2026-11-17T19:00:00Z'))
    await cancellationDialog().get('footer button:last-child').trigger('click')
    expect(useReservationsStore().studentReservations[0]?.status).toBe('confirmed')
    expect(wrapper.get('main [role="status"]').text()).toContain('Prazo de cancelamento encerrado')
    expect(wrapper.get('main li').text()).toContain('às 16h')
    expect(wrapper.findAll('main button')).toHaveLength(0)
    expect(wrapper.get('main a[href="/comprovante"]').text()).toBe('Ver comprovante')
  })
})
