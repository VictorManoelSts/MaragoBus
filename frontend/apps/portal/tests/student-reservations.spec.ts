import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
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
  afterEach(() => { vi.useRealTimers() })

  it('mostra o estado vazio, explica a demonstração e oferece acesso a Fazer reserva', async () => {
    const { router, wrapper } = await page()
    expect(wrapper.get('main').text()).toContain('até recarregar')
    expect(wrapper.get('main').text()).toContain('Você ainda não tem reservas.')
    expect(wrapper.find('main select').exists()).toBe(false)
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

  it('filtra por período e pelo status suportado e informa quando não há resultados', async () => {
    confirm('2026-11-17')
    confirm('2026-11-18')
    vi.setSystemTime(reference)
    const { wrapper } = await page()
    const select = wrapper.get('main select')
    expect(select.findAll('option').filter(option => option.attributes('disabled') === undefined).map(option => option.text()))
      .toEqual(['Todas', 'De hoje', 'Futuras', 'Anteriores', 'Confirmadas', 'Canceladas'])
    await select.setValue('future')
    expect(wrapper.findAll('main h2').map(title => title.text())).toEqual(['Futuras'])
    await select.setValue('today')
    expect(wrapper.get('main h2').text()).toBe('Hoje')
    await select.setValue('past')
    expect(wrapper.get('main [role="status"]').text()).toContain('Nenhuma reserva para o filtro')
    await select.setValue('confirmed')
    expect(wrapper.findAll('main time')).toHaveLength(2)
  })

  it('acompanha novas confirmações e apresenta apenas as reservas da sessão atual', async () => {
    const { wrapper } = await page()
    confirm('2026-11-17', 'Faculdade do primeiro aluno')
    await flushPromises()
    expect(wrapper.get('main').text()).toContain('Faculdade do primeiro aluno')
    useSessionStore().user = { id: 'outro-aluno', name: 'Outro aluno', role: 'student' }
    await flushPromises()
    expect(wrapper.get('main').text()).toContain('Você ainda não tem reservas.')
    expect(wrapper.get('main').text()).not.toContain('Faculdade do primeiro aluno')
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
    const opener = wrapper.get<HTMLButtonElement>('main button')
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
    expect(wrapper.get('main li').text()).toContain('Cancelada')
    expect(wrapper.find('main button').exists()).toBe(false)
    expect(home.get('section').text()).toContain('Cancelada')
    await wrapper.get('main select').setValue('confirmed')
    expect(wrapper.find('main li').exists()).toBe(false)
    await wrapper.get('main select').setValue('cancelled')
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
    expect(wrapper.findAll('main button').map(button => button.text())).toEqual(['Ver comprovante'])
  })
})
