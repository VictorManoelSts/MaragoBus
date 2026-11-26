import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { useSessionStore } from '@maragobus/shared/auth/session'
import App from '../src/App.vue'
import { getMockReservationForm } from '../src/mocks/reservation-form'
import { createPortalRouter } from '../src/router'
import { useReservationsStore } from '../src/stores/reservations'
import { useStudentNotificationsStore } from '../src/stores/student-notifications'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'

async function page() {
  const router = createPortalRouter(createMemoryHistory())
  await router.push('/notificacoes')
  await router.isReady()
  return { router, wrapper: mount(App, { attachTo: document.body, global: { plugins: [router] } }) }
}

describe('Notificações do aluno', () => {
  beforeEach(async () => { await setMockSession('student') })
  afterEach(() => { vi.useRealTimers() })

  it('exibe exemplos identificados, com título, mensagem, data e estado, do mais novo ao mais antigo', async () => {
    const { wrapper } = await page()
    const cards = wrapper.findAll('main li')
    expect(wrapper.get('main').text()).toContain('Avisos de demonstração.')
    expect(cards.map(card => card.get('h2').text())).toEqual([
      'Exemplo de comunicado sobre o calendário', 'Exemplo de orientação de embarque',
    ])
    expect(cards.map(card => card.get('time').attributes('datetime'))).toEqual([
      '2026-11-18T15:00:00Z', '2026-11-16T15:00:00Z',
    ])
    expect(cards[0]?.get('time').text()).toBe('18/11/2026')
    expect(cards.every(card => card.get('p').text().startsWith('Este exemplo mostra'))).toBe(true)
    expect(cards.map(card => card.get('.mb-badge').text())).toEqual(['Não lida', 'Não lida'])
  })

  it('atualiza a leitura individual e em lote, incluindo o contador do sino no cabeçalho', async () => {
    const { router, wrapper } = await page()
    const counters = () => wrapper.findAll('header a[href="/notificacoes"] .mb-badge').map(badge => badge.text())
    expect(counters()).toEqual(['2'])
    const bell = wrapper.get('header a[href="/notificacoes"]')
    expect(bell.text()).toContain('Notificações')
    expect(bell.text()).toContain('2 notificações não lidas')
    expect(bell.get('svg.lucide-bell').attributes('aria-hidden')).toBe('true')
    expect(bell.get('.mb-badge').attributes('aria-hidden')).toBe('true')
    await wrapper.get('main li button').trigger('click')
    expect(wrapper.findAll('main li .mb-badge').map(badge => badge.text())).toEqual(['Lida', 'Não lida'])
    expect(counters()).toEqual(['1'])
    expect(wrapper.get('header a[href="/notificacoes"]').text()).toContain('1 notificação não lida')
    await router.push('/')
    await router.push('/notificacoes')
    await flushPromises()
    expect(counters()).toEqual(['1'])
    await wrapper.get('main button').trigger('click')
    expect(wrapper.findAll('main li .mb-badge').map(badge => badge.text())).toEqual(['Lida', 'Lida'])
    expect(counters()).toEqual([])
    expect(bell.text()).toBe('Notificações')
    expect(wrapper.find('main button').exists()).toBe(false)
  })

  it('isola os avisos e o estado de leitura quando a sessão muda', async () => {
    const { wrapper } = await page()
    const store = useStudentNotificationsStore()
    const originalId = store.notifications[0]!.id
    store.markAsRead(originalId)
    const session = useSessionStore()
    session.user = { id: 'outro-aluno', name: 'Outro aluno', role: 'student' }
    await flushPromises()
    expect(wrapper.get('main').text()).toContain('Você ainda não tem notificações.')
    expect(wrapper.find('main button').exists()).toBe(false)
    expect(wrapper.find('header a[href="/notificacoes"] .mb-badge').exists()).toBe(false)
    store.markAsRead(originalId)
    store.markAllAsRead()
    expect(store.readIds).toEqual([])
    await setMockSession('student')
    expect(store.unreadCount).toBe(2)
    session.logout()
    expect(store.notifications).toEqual([])
  })

  it('mantém o foco após remover os acionadores de leitura individual e em lote', async () => {
    const { wrapper } = await page()
    const notice = wrapper.get('main li')
    const individual = notice.get<HTMLButtonElement>('button')
    individual.element.focus()
    await individual.trigger('click')
    expect(individual.element.isConnected).toBe(false)
    expect(document.activeElement).toBe(notice.get('h2').element)
    expect(notice.get('h2').attributes('tabindex')).toBe('-1')
    expect(notice.get('.mb-badge').text()).toBe('Lida')

    const all = wrapper.get<HTMLButtonElement>('main button')
    all.element.focus()
    await all.trigger('click')
    expect(all.element.isConnected).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('main h1').element)
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
