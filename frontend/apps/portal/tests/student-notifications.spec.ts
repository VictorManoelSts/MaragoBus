import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { selectStudentDemo } from '@maragobus/shared/auth/student-demo'
import App from '../src/App.vue'
import { getMockReservationForm } from '../src/mocks/reservation-form'
import { createPortalRouter } from '../src/router'
import { useReservationsStore } from '../src/stores/reservations'
import { useStudentNotificationsStore } from '../src/stores/student-notifications'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'

const bellSelector = 'header button[aria-label="Notificações"]'
const panelSelector = '[role="dialog"]'
const closeSelector = 'button[aria-label="Fechar notificações"]'

async function page(path = '/reservas') {
  const router = createPortalRouter(createMemoryHistory())
  await router.push(path)
  await router.isReady()
  const wrapper = mount(App, { attachTo: document.body, global: { plugins: [router] } })
  async function openPanel() {
    await wrapper.get(bellSelector).trigger('click')
    return wrapper.get(panelSelector)
  }
  return { router, wrapper, openPanel }
}

describe('Notificações do aluno', () => {
  beforeEach(async () => { await setMockSession('student') })
  afterEach(() => {
    selectStudentDemo(null)
    vi.useRealTimers()
  })

  it('limita a largura e a altura do painel ao espaço disponível na janela', () => {
    const component = readFileSync(resolvePath('apps/portal/src/components/StudentNotificationsPanel.vue'), 'utf8')
    expect(component).toContain('width: min(26rem, calc(100cqw - 2rem))')
    expect(component).toContain('max-height: calc(100dvh - 6rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))')
    expect(component).toMatch(/@media \(max-height: 24rem\) \{\s*\.notification-panel \{\s*overflow-y: auto/)
  })

  it('abre sem navegar, nomeia o painel e move o foco para o título', async () => {
    const { router, wrapper, openPanel } = await page()
    const bell = wrapper.get(bellSelector)
    expect(bell.attributes('aria-haspopup')).toBe('dialog')
    expect(bell.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find(panelSelector).exists()).toBe(false)

    const panel = await openPanel()
    const heading = panel.get('h2')
    expect(router.currentRoute.value.path).toBe('/reservas')
    expect(wrapper.get('main h1').text()).toBe('Minhas reservas')
    expect(bell.attributes('aria-expanded')).toBe('true')
    expect(bell.attributes('aria-controls')).toBe(panel.attributes('id'))
    expect(panel.attributes('aria-labelledby')).toBe(heading.attributes('id'))
    expect(heading.text()).toBe('Notificações')
    expect(document.activeElement).toBe(heading.element)
    expect(panel.find(closeSelector).exists()).toBe(true)

    await bell.trigger('click')
    expect(wrapper.find(panelSelector).exists()).toBe(false)
    expect(bell.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(bell.element)
  })

  it.each(['botão', 'Escape', 'clique fora'])('fecha pelo acionamento de %s e devolve o foco ao sino', async method => {
    const { router, wrapper, openPanel } = await page()
    const panel = await openPanel()
    if (method === 'botão') await panel.get(closeSelector).trigger('click')
    else if (method === 'Escape') await panel.get('h2').trigger('keydown', { key: 'Escape' })
    else {
      await panel.get('h2').trigger('click')
      expect(wrapper.find(panelSelector).exists()).toBe(true)
      await wrapper.get('main h1').trigger('click')
    }
    expect(wrapper.find(panelSelector).exists()).toBe(false)
    const bell = wrapper.get(bellSelector)
    expect(bell.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(bell.element)
    expect(router.currentRoute.value.path).toBe('/reservas')
  })

  it('fecha ao transferir foco para fora e mantém o destino focado', async () => {
    const { wrapper, openPanel } = await page()
    await openPanel()
    const main = wrapper.get<HTMLElement>('main')
    main.element.focus()
    await flushPromises()
    expect(wrapper.find(panelSelector).exists()).toBe(false)
    expect(document.activeElement).toBe(main.element)
  })

  it('exibe exemplos identificados, com título, mensagem, data e estado, do mais novo ao mais antigo', async () => {
    const { openPanel } = await page()
    const panel = await openPanel()
    const cards = panel.findAll('li')
    expect(panel.text()).toContain('Avisos de demonstração.')
    expect(cards.map(card => card.get('h3').text())).toEqual([
      'Exemplo de comunicado sobre o calendário', 'Exemplo de orientação de embarque',
    ])
    expect(cards.map(card => card.get('time').attributes('datetime'))).toEqual([
      '2026-11-18T15:00:00Z', '2026-11-16T15:00:00Z',
    ])
    expect(cards[0]?.get('time').text()).toBe('18/11/2026')
    expect(cards.every(card => card.get('p').text().startsWith('Este exemplo mostra'))).toBe(true)
    expect(cards.map(card => card.get('.mb-badge').text())).toEqual(['Não lida', 'Não lida'])
  })

  it('atualiza a leitura individual e em lote e anuncia o contador sem navegar', async () => {
    const { router, wrapper, openPanel } = await page()
    const bell = wrapper.get(bellSelector)
    const badge = () => bell.find('.mb-badge')
    const description = () => document.getElementById(bell.attributes('aria-describedby') ?? '')?.textContent
    expect(badge().text()).toBe('2')
    expect(description()).toBe('2 notificações não lidas')
    expect(bell.get('svg.lucide-bell').attributes('aria-hidden')).toBe('true')
    expect(badge().attributes('aria-hidden')).toBe('true')
    const panel = await openPanel()
    expect(panel.get('[role="status"]').text()).toBe('2 notificações não lidas')

    await panel.get('li button[aria-label^="Marcar como lida"]').trigger('click')
    expect(panel.findAll('li .mb-badge').map(item => item.text())).toEqual(['Lida', 'Não lida'])
    expect(badge().text()).toBe('1')
    expect(description()).toBe('1 notificação não lida')
    expect(panel.get('[role="status"]').text()).toBe('1 notificação não lida')

    await panel.get(closeSelector).trigger('click')
    expect(badge().text()).toBe('1')
    const reopened = await openPanel()
    await reopened.findAll('button').find(button => button.text() === 'Marcar todas como lidas')!.trigger('click')
    expect(reopened.findAll('li .mb-badge').map(item => item.text())).toEqual(['Lida', 'Lida'])
    expect(badge().exists()).toBe(false)
    expect(description()).toBe('0 notificações não lidas')
    expect(reopened.get('[role="status"]').text()).toBe('0 notificações não lidas')
    expect(reopened.findAll('button')).toHaveLength(1)
    expect(router.currentRoute.value.path).toBe('/reservas')

    await router.push('/perfil')
    expect(wrapper.find(panelSelector).exists()).toBe(false)
    expect(badge().exists()).toBe(false)
  })

  it('fecha ao trocar a sessão e isola avisos, contador e leitura', async () => {
    const { wrapper, openPanel } = await page()
    const store = useStudentNotificationsStore()
    const originalId = store.notifications[0]!.id
    await openPanel()
    store.markAsRead(originalId)
    const session = useSessionStore()
    session.user = { id: 'outro-aluno', name: 'Outro aluno', role: 'student' }
    await flushPromises()
    expect(wrapper.find(panelSelector).exists()).toBe(false)

    const empty = await openPanel()
    expect(empty.text()).toContain('Você ainda não tem notificações.')
    expect(empty.findAll('button')).toHaveLength(1)
    expect(wrapper.find(bellSelector + ' .mb-badge').exists()).toBe(false)
    store.markAsRead(originalId)
    store.markAllAsRead()
    expect(store.readIds).toEqual([])
    await setMockSession('student')
    expect(store.unreadCount).toBe(2)
    await openPanel()
    await session.logout()
    expect(store.notifications).toEqual([])
    expect(wrapper.find(panelSelector).exists()).toBe(false)
  })

  it('mantém o foco após remover os acionadores de leitura individual e em lote', async () => {
    const { openPanel } = await page()
    const panel = await openPanel()
    const notice = panel.get('li')
    const individual = notice.get<HTMLButtonElement>('button')
    individual.element.focus()
    await individual.trigger('click')
    expect(individual.element.isConnected).toBe(false)
    expect(document.activeElement).toBe(notice.get('h3').element)
    expect(notice.get('h3').attributes('aria-describedby')).toBe(notice.get('.mb-badge').attributes('id'))
    expect(notice.get('.mb-badge').text()).toBe('Lida')

    const all = panel.findAll('button').find(button => button.text() === 'Marcar todas como lidas')!
    all.element.focus()
    await all.trigger('click')
    expect(all.element.isConnected).toBe(false)
    expect(document.activeElement).toBe(panel.get('h2').element)
  })

  it('apresenta o contador e a leitura inicial do cenário demonstrativo', async () => {
    const { router, wrapper, openPanel } = await page('/demo-aluno?cenario=completo')
    await useSessionStore().login({ cpf: '90000000175', password: 'AlunoTeste!53' })
    await router.push('/')
    expect(wrapper.get(bellSelector + ' .mb-badge').text()).toBe('1')
    const panel = await openPanel()
    expect(panel.findAll('li .mb-badge').map(item => item.text())).toEqual(['Não lida', 'Lida'])
  })


  it('preserva os avisos ao confirmar, consultar comprovante e cancelar uma reserva', () => {
    const notifications = useStudentNotificationsStore()
    const original = notifications.notifications
    const reservations = useReservationsStore()
    const now = new Date('2026-11-18T13:00:00Z')
    vi.setSystemTime(now)
    const result = reservations.confirm({
      travelDate: '2026-11-18', boardingPointId: 'demo-center', closures: [],
      context: getMockReservationForm('mock-student-test'),
    })
    if (result.status !== 'confirmed') throw new Error('Falha na reserva de teste')
    expect(notifications.notifications).toEqual(original)
    expect(reservations.getReceiptReservation(result.reservation.id, now)).toBeDefined()
    expect(reservations.cancel(result.reservation.id)).toBe('cancelled')
    expect(notifications.notifications).toEqual(original)
    expect(notifications.unreadCount).toBe(original.length)
  })
})
