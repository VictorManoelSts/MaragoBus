import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createMemoryHistory } from 'vue-router'
import { BaseSelect } from '@maragobus/shared'
import { useSessionStore } from '@maragobus/shared/auth/session'
import HomePage from '../src/pages/HomePage.vue'
import { getMockReservationForm } from '../src/mocks/reservation-form'
import { createPortalRouter } from '../src/router'
import { useReservationsStore } from '../src/stores/reservations'
import { useStudentProfileStore } from '../src/stores/student-profile'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'

const current = 'section[aria-labelledby="current-reservation-title"]'
const upcoming = 'section[aria-labelledby="next-reservation-title"]'
const cancelled = 'section[aria-labelledby="cancelled-reservation-title"]'

function clock(instant: string) {
  vi.setSystemTime(new Date(instant))
}

function context() {
  return getMockReservationForm('mock-student-test')
}

function confirm(travelDate: string) {
  const result = useReservationsStore().confirm({
    travelDate, boardingPointId: 'demo-center', closures: [], context: context(),
  })
  if (result.status !== 'confirmed') throw new Error('Falha na reserva de teste')
  return result.reservation.id
}

async function page(props?: InstanceType<typeof HomePage>['$props']) {
  const router = createPortalRouter(createMemoryHistory())
  await router.push('/')
  return { router, wrapper: mount(HomePage, { attachTo: document.body, props, global: { plugins: [router] } }) }
}

describe('Reservas na página inicial', () => {
  beforeEach(async () => {
    await setMockSession('student')
    clock('2026-11-16T13:59:00Z')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('saúda pelo primeiro nome e apresenta o formulário integrado com controles acessíveis', async () => {
    const { wrapper } = await page()
    expect(wrapper.get('h1').text()).toBe('Olá, Aluno!')
    expect(wrapper.text()).toContain('Acompanhe e gerencie suas reservas de transporte.')
    expect(wrapper.find('nav').exists()).toBe(false)
    expect(wrapper.find(current).exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Resumo da seleção')
    const form = wrapper.get('form')
    expect(form.text()).toContain('Reservas abertas')
    expect(form.get('time[datetime="2026-11-16"]').text()).toBe('16/11/2026')
    expect(form.get('time[datetime="2026-11-16T14:00:00.000Z"]').text()).toBe('11:00')
    expect(wrapper.findComponent(BaseSelect).exists()).toBe(true)
    expect(form.get('label').attributes('for')).toBe(form.get('select').attributes('id'))
    expect(form.get('#' + form.get('select').attributes('aria-describedby')).text()).toContain('apenas para esta reserva')
    expect(form.findAll('option').slice(1).map(option => option.text())).toEqual(context().boardingPoints.map(point => point.name))
    expect(form.get('button').attributes('disabled')).toBeDefined()
    await form.get('select').setValue('demo-north')
    expect(form.get('button').attributes('disabled')).toBeUndefined()
    expect(form.get('button').attributes('type')).toBe('submit')
    expect(useReservationsStore().studentReservations).toHaveLength(0)
  })

  it('exibe a próxima abertura às 17h e não oferece ação após o fechamento às 11h', async () => {
    clock('2026-11-16T14:00:00Z')
    const { wrapper } = await page()
    expect(wrapper.text()).toContain('Reservas fechadas')
    expect(wrapper.get('time[datetime="2026-11-16T20:00:00.000Z"]').text()).toContain('17:00')
    expect(wrapper.get('time[datetime="2026-11-17"]').text()).toBe('17/11/2026')
    expect(wrapper.find('form, button').exists()).toBe(false)
    expect(useReservationsStore().studentReservations).toHaveLength(0)
  })

  it('mostra interrupção, data, motivo e próxima abertura sem oferecer confirmação', async () => {
    const { wrapper } = await page({ closures: [
      { date: '2026-11-16', reason: 'Manutenção', description: 'Revisão do veículo' },
    ] })
    expect(wrapper.text()).toContain('Transporte interrompido')
    expect(wrapper.text()).toContain('Não haverá transporte em 16/11/2026.')
    expect(wrapper.text()).toContain('Manutenção')
    expect(wrapper.text()).toContain('Revisão do veículo')
    expect(wrapper.text()).toContain('Próxima abertura')
    expect(wrapper.find('form, button').exists()).toBe(false)
  })

  it.each([
    [{ college: ' ' }, 'faculdade cadastrada'],
    [{ boardingPoints: [] }, 'Nenhum ponto de embarque disponível'],
  ] as const)('explica quando o cadastro impede reservar', async (partial, message) => {
    const { wrapper } = await page({ context: { ...context(), ...partial } })
    expect(wrapper.text()).toContain(message)
    expect(wrapper.find('form, button').exists()).toBe(false)
  })

  it('descarta um ponto padrão que não consta entre as opções', async () => {
    const { wrapper } = await page({ context: { ...context(), defaultBoardingPointId: 'invalido' } })
    expect(wrapper.get('select').element.value).toBe('')
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })

  it('preserva a seleção na mesma viagem e restaura a preferência ao abrir a próxima às 17h', async () => {
    vi.useFakeTimers()
    clock('2026-11-16T13:58:59Z')
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const profile = useStudentProfileStore()
    expect(profile.saveDefaultPoint('demo-center')).toBe(true)
    const { wrapper } = await page()
    expect(wrapper.get('select').element.value).toBe('demo-center')
    await wrapper.get('select').setValue('demo-north')
    vi.advanceTimersByTime(1_000)
    await nextTick()
    expect(wrapper.get('select').element.value).toBe('demo-north')
    vi.advanceTimersByTime(60_000)
    await nextTick()
    expect(wrapper.text()).toContain('Reservas fechadas')
    expect(profile.saveDefaultPoint('demo-south')).toBe(true)
    vi.advanceTimersByTime(6 * 60 * 60_000)
    await nextTick()
    expect(wrapper.get('form time').attributes('datetime')).toBe('2026-11-17')
    expect(wrapper.get('select').element.value).toBe('demo-south')
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('atualiza a janela ao voltar à aba e mantém apenas um temporizador', async () => {
    vi.useFakeTimers()
    clock('2026-11-16T15:00:00Z')
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    const { wrapper } = await page()
    expect(wrapper.text()).toContain('Reservas fechadas')
    expect(vi.getTimerCount()).toBe(0)

    clock('2026-11-16T20:00:00Z')
    visibility.mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()
    expect(wrapper.text()).toContain('Reservas abertas')
    expect(vi.getTimerCount()).toBe(1)
    wrapper.unmount()
    document.dispatchEvent(new Event('visibilitychange'))
    expect(vi.getTimerCount()).toBe(0)
  })

  it('mantém o anúncio de confirmação até a meia-noite em Maceió', async () => {
    vi.useFakeTimers()
    clock('2026-11-16T13:59:59Z')
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const { wrapper } = await page()
    await wrapper.get('select').setValue('demo-north')
    await wrapper.get('form').trigger('submit')
    const original = useReservationsStore().findConfirmed('2026-11-16')
    expect(original?.boardingPointId).toBe('demo-north')
    vi.advanceTimersByTime(1_000)
    await nextTick()
    expect(wrapper.text()).toContain('Reservas fechadas')
    expect(wrapper.get('[role="status"].sr-only').text()).toContain('Reserva confirmada para 16/11/2026')

    clock('2026-11-17T02:59:59Z')
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()
    expect(wrapper.get('[role="status"].sr-only').text()).toContain('Reserva confirmada para 16/11/2026')
    vi.advanceTimersByTime(1_000)
    await nextTick()
    expect(wrapper.get('[role="status"].sr-only').text()).toBe('')
    expect(wrapper.find(current).exists()).toBe(false)
    expect(useReservationsStore().findConfirmed('2026-11-16')).toBe(original)
  })

  it('revalida o horário ao enviar uma data cuja janela acabou de fechar', async () => {
    const { wrapper } = await page()
    await wrapper.get('select').setValue('demo-south')
    clock('2026-11-16T14:00:00Z')
    await wrapper.get('form').trigger('submit')
    expect(useReservationsStore().studentReservations).toHaveLength(0)
    expect(wrapper.text()).toContain('A disponibilidade mudou')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('confirma uma única vez no cartão atual sem alterar perfil, sessão, armazenamento ou rede', async () => {
    const profile = useStudentProfileStore()
    expect(profile.saveDefaultPoint('demo-center')).toBe(true)
    const userBefore = JSON.stringify(useSessionStore().user)
    const cookieBefore = document.cookie
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem')
    const { wrapper, router } = await page()
    await wrapper.get('select').setValue('demo-south')
    const reservationForm = wrapper.get('form')
    await Promise.all([reservationForm.trigger('submit'), reservationForm.trigger('submit')])
    expect(useReservationsStore().studentReservations).toHaveLength(1)
    expect(wrapper.get(current).text()).toContain('Confirmada')
    expect(wrapper.get(current).text()).toContain('Parada de exemplo — Bairro Sul')
    expect(document.activeElement).toBe(wrapper.get(current).get('h2').element)
    expect(wrapper.get('[role="status"]').text()).toContain('Reserva confirmada para 16/11/2026')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(profile.reservationContext.defaultBoardingPointId).toBe('demo-center')
    expect(JSON.stringify(useSessionStore().user)).toBe(userBefore)
    expect(document.cookie).toBe(cookieBefore)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(xhrSpy).not.toHaveBeenCalled()
    expect(storageSpy).not.toHaveBeenCalled()
    await wrapper.get(current).get('a[href="/reservas"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/reservas'))
    wrapper.unmount()
    const { wrapper: reopened } = await page()
    const reservation = reopened.get(current)
    expect(reservation.get('time').attributes('datetime')).toBe('2026-11-16')
    expect(reservation.text()).toContain('Faculdade de Demonstração')
    expect(reservation.text()).toContain('Parada de exemplo — Bairro Sul')
    expect(reopened.get('[role="status"].sr-only').text()).toBe('')
  })

  it('mantém a reserva atual às 17h e apresenta a próxima confirmação até a meia-noite', async () => {
    confirm('2026-11-16')
    clock('2026-11-16T19:59:59Z')
    vi.useFakeTimers()
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const { wrapper } = await page()
    expect(wrapper.find('form').exists()).toBe(false)
    vi.advanceTimersByTime(1_000)
    await nextTick()
    expect(wrapper.get(current).get('a[href="/comprovante"]').text()).toBe('Ver comprovante')
    expect(wrapper.get('form time').attributes('datetime')).toBe('2026-11-17')
    await wrapper.get('select').setValue('demo-north')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get(current).get('time').attributes('datetime')).toBe('2026-11-16')
    expect(wrapper.get(upcoming).get('time').text()).toBe('17/11/2026')
    expect(wrapper.get(upcoming).text()).toContain('a partir das 00h')
    expect(wrapper.get(upcoming).find('dl').exists()).toBe(false)
    expect(wrapper.get(upcoming).find('button').exists()).toBe(false)
    expect(wrapper.find('form').exists()).toBe(false)
    clock('2026-11-17T02:59:59Z')
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(1_000)
    await nextTick()
    expect(wrapper.find(upcoming).exists()).toBe(false)
    expect(wrapper.get(current).get('time').attributes('datetime')).toBe('2026-11-17')
    expect(wrapper.get(current).get('a[href="/comprovante"]').text()).toBe('Ver comprovante')
  })

  it('mostra cancelamento futuro e mantém o registro na virada do dia', async () => {
    clock('2026-11-16T20:00:00Z')
    const id = confirm('2026-11-17')
    const { wrapper } = await page()
    expect(wrapper.find(current).exists()).toBe(false)
    expect(wrapper.get(upcoming).text()).toContain('Confirmada')
    expect(useReservationsStore().cancel(id)).toBe('cancelled')
    await nextTick()
    expect(wrapper.find(upcoming).exists()).toBe(false)
    expect(wrapper.get(cancelled).text()).toContain('Cancelada')
    expect(wrapper.find('form, button').exists()).toBe(false)
    clock('2026-11-17T03:00:00Z')
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()
    expect(wrapper.find(cancelled).exists()).toBe(false)
    expect(wrapper.get(current).text()).toContain('Cancelada')
    expect(wrapper.find('form, button').exists()).toBe(false)
  })

  it('limpa reserva, confirmação e seleção ao trocar de aluno', async () => {
    const { wrapper } = await page()
    await wrapper.get('select').setValue('demo-south')
    await wrapper.get('form').trigger('submit')
    useSessionStore().user = { id: 'outro-aluno', name: 'João da Silva', role: 'student' }
    await nextTick()
    expect(wrapper.get('h1').text()).toBe('Olá, João!')
    expect(wrapper.find(current).exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Reserva confirmada para')
    expect(wrapper.text()).not.toContain('90000000175')
    expect(wrapper.find('form, button').exists()).toBe(false)
    await setMockSession('student')
    await nextTick()
    expect(wrapper.get(current).text()).toContain('Confirmada')
    expect(wrapper.text()).not.toContain('Reserva confirmada para')
    clock('2026-11-16T20:00:00Z')
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()
    expect(wrapper.get('select').element.value).toBe('')
  })
})
