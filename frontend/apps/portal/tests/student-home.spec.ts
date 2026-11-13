import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { useSessionStore } from '@maragobus/shared/auth/session'
import HomePage from '../src/pages/HomePage.vue'
import { createPortalRouter } from '../src/router'
import { getMockStudentHome } from '../src/mocks/student-home'
import type { StudentHomeSummary, StudentReservationSummary } from '../src/types/student-home'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'

const current: StudentReservationSummary = {
  id: 'synthetic-current', travelDate: '2026-11-12', college: 'Faculdade de teste',
  boardingPoint: 'Ponto de teste', status: 'confirmed',
}
const future: StudentReservationSummary = {
  ...current, id: 'synthetic-future', travelDate: '2026-11-13', college: 'Destino futuro de teste',
}
async function page(summary?: StudentHomeSummary) {
  const router = createPortalRouter(createMemoryHistory())
  await router.push('/')
  await router.isReady()
  const wrapper = mount(HomePage, { props: summary ? { summary } : {}, global: { plugins: [router] } })
  return { wrapper, router }
}

describe('Página inicial do aluno', () => {
  beforeEach(async () => { await setMockSession('student') })

  it('usa o nome da sessão e acompanha sua atualização sem expor dados pessoais', async () => {
    const { wrapper } = await page()
    expect(wrapper.get('h1').text()).toBe('Olá, Aluno!')
    useSessionStore().user = { id: 'test', name: 'João da Silva', role: 'student' }
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Olá, João!')
    expect(wrapper.text()).not.toContain('90000000175')
  })

  it('apresenta o estado vazio por padrão sem inventar reserva ou disponibilidade', async () => {
    const { wrapper } = await page()
    expect(wrapper.get('h2').text()).toBe('Sua reserva atual')
    expect(wrapper.text()).toContain('Você não tem uma reserva atual para apresentar.')
    expect(wrapper.find('time').exists()).toBe(false)
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.text()).not.toMatch(/reservas (abertas|fechadas)/i)
    expect(getMockStudentHome()).toEqual({ currentReservation: null, futureReservation: null })
  })

  it('exibe os dados essenciais da reserva atual e acesso aos detalhes', async () => {
    const { wrapper, router } = await page({ currentReservation: current, futureReservation: null })
    expect(wrapper.get('time').attributes('datetime')).toBe('2026-11-12')
    expect(wrapper.get('time').text()).toBe('12/11/2026')
    expect(wrapper.get('dl').text()).toContain('Faculdade de teste')
    expect(wrapper.get('dl').text()).toContain('Ponto de teste')
    expect(wrapper.text()).toContain('Confirmada')
    await wrapper.get('section a').trigger('click')
    await flushPromises()
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/reservas'))
  })

  it('mantém a reserva atual quando há futura confirmada e mostra somente aviso contextual', async () => {
    const { wrapper } = await page({ currentReservation: current, futureReservation: future })
    expect(wrapper.get('[role="status"]').text()).toBe('Sua reserva para o próximo dia de viagem está confirmada.')
    expect(wrapper.get('time').text()).toBe('12/11/2026')
    expect(wrapper.findAll('time')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('Destino futuro de teste')
    expect(wrapper.get('section').element.lastElementChild?.getAttribute('role')).toBe('status')
  })

  it('não promove uma reserva futura a atual quando a atual está ausente', async () => {
    const { wrapper } = await page({ currentReservation: null, futureReservation: future })
    expect(wrapper.text()).toContain('Você não tem uma reserva atual')
    expect(wrapper.find('time').exists()).toBe(false)
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
  })

  it('não mostra aviso de confirmação para futura cancelada', async () => {
    const { wrapper } = await page({ currentReservation: current, futureReservation: { ...future, status: 'cancelled' } })
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('navega para fazer reserva a partir do estado vazio', async () => {
    const { wrapper, router } = await page()
    await wrapper.get('section a').trigger('click')
    await flushPromises()
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/reservar'))
  })

  it.each(['/reservar', '/reservas', '/notificacoes'])('atalho acessível navega para %s', async path => {
    const { wrapper, router } = await page()
    const link = wrapper.get(`nav a[href="${path}"]`)
    expect(link.attributes('tabindex')).toBeUndefined()
    expect(link.get('svg').attributes('aria-hidden')).toBe('true')
    await link.trigger('click')
    await flushPromises()
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe(path))
  })

  it('reserva notificações a avisos administrativos, sem contadores ou ações fictícias', async () => {
    const { wrapper } = await page()
    expect(wrapper.text()).toContain('avisos administrativos')
    expect(wrapper.findAll('nav a').map(link => link.text())).toEqual(['Fazer reserva', 'Minhas reservas', 'Notificações'])
    expect(wrapper.text()).not.toMatch(/não lidas|notificação de confirmação|download|comprovante|cancelar/i)
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('não faz chamadas de rede nem persiste reservas ao montar ou navegar', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Rede proibida'))
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    try {
      const { wrapper } = await page()
      await wrapper.get('nav a[href="/reservas"]').trigger('click')
      await flushPromises()
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(xhrSpy).not.toHaveBeenCalled()
      expect(localStorage.length).toBe(0)
    } finally { fetchSpy.mockRestore(); xhrSpy.mockRestore() }
  })
})
