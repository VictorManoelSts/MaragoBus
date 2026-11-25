import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createMemoryHistory } from 'vue-router'
import { BaseSelect } from '@maragobus/shared'
import { useSessionStore } from '@maragobus/shared/auth/session'
import NewReservationPage from '../src/pages/NewReservationPage.vue'
import App from '../src/App.vue'
import { getMockReservationForm } from '../src/mocks/reservation-form'
import { createPortalRouter } from '../src/router'
import { useReservationsStore } from '../src/stores/reservations'
import { useStudentProfileStore } from '../src/stores/student-profile'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'

describe('Interface Fazer reserva', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-11-16T13:59:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('apresenta a janela aberta com data civil e encerramento no horário de Alagoas', () => {
    const wrapper = mount(NewReservationPage)
    expect(wrapper.get('h1').text()).toBe('Fazer reserva')
    expect(wrapper.text()).toContain('Confira as informações da viagem e selecione seu ponto de embarque.')
    expect(wrapper.get('time[datetime="2026-11-16"]').text()).toBe('Segunda-feira, 16 de novembro de 2026')
    expect(wrapper.get('time[datetime="2026-11-16T14:00:00.000Z"]').text()).toBe('11:00')
    expect(wrapper.text()).toContain('Reservas abertas')
    expect(wrapper.get('[role="status"]').text()).toContain('dados de demonstração')
  })

  it('apresenta a janela fechada, a próxima abertura e a próxima viagem', async () => {
    await setMockSession('student')
    vi.setSystemTime(new Date('2026-11-16T14:00:00Z'))
    const wrapper = mount(NewReservationPage)
    expect(wrapper.text()).toContain('Reservas fechadas')
    expect(wrapper.text()).toContain('Próxima abertura conhecida')
    expect(wrapper.get('time[datetime="2026-11-16T20:00:00.000Z"]').text()).toContain('17:00')
    expect(wrapper.get('time[datetime="2026-11-17"]').text()).toBe('Terça-feira, 17 de novembro de 2026')
    expect(wrapper.find('select').exists()).toBe(false)
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })

  it('informa a data sem transporte, o motivo e a impossibilidade de reservar', async () => {
    await setMockSession('student')
    const wrapper = mount(NewReservationPage, { props: { closures: [
      { date: '2026-11-16', reason: 'Manutenção', description: 'Revisão do veículo' },
    ] } })
    expect(wrapper.text()).toContain('Não haverá transporte em Segunda-feira, 16 de novembro de 2026.')
    expect(wrapper.text()).toContain('Manutenção')
    expect(wrapper.text()).toContain('Revisão do veículo')
    expect(wrapper.text()).toContain('Não é possível reservar para essa data.')
    expect(wrapper.find('select').exists()).toBe(false)
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })

  it('preserva a seleção na mesma viagem e usa o ponto padrão atual ao abrir a próxima às 17h', async () => {
    await setMockSession('student')
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-16T13:58:59Z'))
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const profile = useStudentProfileStore()
    expect(profile.saveDefaultPoint('demo-center')).toBe(true)
    const wrapper = mount(NewReservationPage)
    await wrapper.get('select').setValue('demo-north')
    vi.advanceTimersByTime(1_000)
    await nextTick()
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('demo-north')
    vi.advanceTimersByTime(60_000)
    await nextTick()
    expect(wrapper.text()).toContain('Reservas fechadas')
    expect(profile.saveDefaultPoint('demo-south')).toBe(true)
    vi.advanceTimersByTime(6 * 60 * 60_000)
    await nextTick()
    expect(wrapper.text()).toContain('Reservas abertas')
    expect(wrapper.find('time[datetime="2026-11-17"]').exists()).toBe(true)
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('demo-south')
    expect(wrapper.get('section').text()).toContain('Parada de exemplo — Bairro Sul')
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('mantém o sucesso no dia da viagem e não reapresenta a confirmação após a virada em Maceió', async () => {
    await setMockSession('student')
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-16T13:59:59Z'))
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const store = useReservationsStore()
    const wrapper = mount(NewReservationPage)
    await wrapper.get('select').setValue('demo-north')
    await wrapper.get('button').trigger('click')
    const original = store.findConfirmed('2026-11-16')
    expect(original?.boardingPointId).toBe('demo-north')
    vi.advanceTimersByTime(1_000)
    await nextTick()
    expect(wrapper.text()).toContain('Reserva de demonstração confirmada!')

    vi.setSystemTime(new Date('2026-11-17T02:59:59Z'))
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()
    expect(wrapper.text()).not.toContain('Reserva de demonstração confirmada!')
    vi.advanceTimersByTime(1_000)
    await nextTick()
    expect(wrapper.text()).not.toContain('Reserva de demonstração confirmada!')

    vi.setSystemTime(new Date('2026-11-17T14:00:00Z'))
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()
    expect(wrapper.text()).toContain('Reservas fechadas')
    expect(wrapper.text()).not.toContain('Reserva de demonstração confirmada!')
    expect(wrapper.find('time[datetime="2026-11-16"]').exists()).toBe(false)
    expect(store.findConfirmed('2026-11-16')).toBe(original)
  })

  it('recalcula ao voltar à aba e mantém somente um timer', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-16T15:00:00Z'))
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    const wrapper = mount(NewReservationPage)
    expect(wrapper.text()).toContain('Reservas fechadas')
    expect(vi.getTimerCount()).toBe(0)
    vi.setSystemTime(new Date('2026-11-16T20:00:00Z'))
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

  it('mostra faculdade disponível somente como leitura e a repete no resumo', () => {
    const wrapper = mount(NewReservationPage, { props: { context: { ...getMockReservationForm(), college: 'Faculdade de demonstração' } } })
    expect(wrapper.get('section').text()).toContain('Faculdade de demonstração')
    expect(wrapper.findAll('dd').filter(item => item.text() === 'Faculdade de demonstração')).toHaveLength(2)
    expect(wrapper.findAll('select')).toHaveLength(1)
    expect(wrapper.get('label').text()).toBe('Ponto de embarque')
  })

  it('mostra estado neutro sem faculdade e não inventa ponto padrão', () => {
    const wrapper = mount(NewReservationPage)
    expect(wrapper.text()).toContain('Faculdade não informada neste modelo de demonstração.')
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('')
    expect(wrapper.get('option').text()).toBe('Escolha um ponto de embarque')
    expect(wrapper.get('section').text()).toContain('Nenhum ponto selecionado.')
  })

  it('reutiliza BaseSelect com label e ajuda associados e todas as opções do mock', () => {
    const wrapper = mount(NewReservationPage)
    expect(wrapper.findComponent(BaseSelect).exists()).toBe(true)
    expect(wrapper.get('label').attributes('for')).toBe(wrapper.get('select').attributes('id'))
    expect(wrapper.get('select').attributes('aria-describedby')).toBe('reservation-boarding-point-help')
    expect(wrapper.get('#reservation-boarding-point-help').text()).toContain('perfil não será alterado')
    expect(wrapper.findAll('option').slice(1).map(option => option.text()))
      .toEqual(getMockReservationForm().boardingPoints.map(point => point.name))
    expect(wrapper.get('select').attributes('tabindex')).toBeUndefined()
  })

  it('atualiza o resumo ao selecionar e trocar o ponto', async () => {
    const wrapper = mount(NewReservationPage)
    await wrapper.get('select').setValue('demo-center')
    expect(wrapper.get('section [aria-live="polite"]').text()).toBe('Praça de exemplo — Centro')
    await wrapper.get('select').setValue('demo-north')
    expect(wrapper.get('section [aria-live="polite"]').text()).toBe('Parada de exemplo — Bairro Norte')
    expect(wrapper.get('section').text()).not.toContain('Praça de exemplo — Centro')
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })

  it('usa ponto padrão fornecido pelo modelo sem modificá-lo ao trocar a seleção', async () => {
    const context = { ...getMockReservationForm(), defaultBoardingPointId: 'demo-center' }
    const wrapper = mount(NewReservationPage, { props: { context } })
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('demo-center')
    expect(wrapper.get('section').text()).toContain('Praça de exemplo — Centro')
    await wrapper.get('select').setValue('demo-south')
    expect(context.defaultBoardingPointId).toBe('demo-center')
  })

  it('ignora ponto padrão ausente da lista sem inventar substituto', () => {
    const wrapper = mount(NewReservationPage, { props: { context: { ...getMockReservationForm(), defaultBoardingPointId: 'unknown' } } })
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('')
    expect(wrapper.get('section').text()).toContain('Nenhum ponto selecionado.')
  })

  it('mantém confirmação desabilitada com explicação acessível sem submissão', async () => {
    const wrapper = mount(NewReservationPage)
    const button = wrapper.get('button')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('aria-describedby')).toBe('reservation-confirmation-help')
    expect(wrapper.get('#reservation-confirmation-help').text()).toContain('Entre com uma conta de aluno')
    await button.trigger('click')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).not.toMatch(/reserva (concluída|criada com sucesso)/i)
  })

  it('exige ponto selecionado mesmo para o aluno de demonstração', async () => {
    await setMockSession('student')
    const wrapper = mount(NewReservationPage)
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.get('#reservation-confirmation-help').text()).toContain('Selecione um ponto')
    await wrapper.get('select').setValue('demo-south')
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
  })

  it('orienta o aluno sem faculdade válida e impede a confirmação com ponto válido', async () => {
    await setMockSession('student')
    const wrapper = mount(NewReservationPage, { props: { context: { ...getMockReservationForm(), college: '  ' } } })
    await wrapper.get('select').setValue('demo-south')
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.get('#reservation-confirmation-help').text()).toContain('faculdade cadastrada')
  })

  it('reavalia o horário ao clicar mesmo com a interface ainda aberta', async () => {
    await setMockSession('student')
    const wrapper = mount(NewReservationPage)
    await wrapper.get('select').setValue('demo-south')
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
    vi.setSystemTime(new Date('2026-11-16T14:00:00Z'))
    await wrapper.get('button').trigger('click')
    expect(useReservationsStore().studentReservations).toHaveLength(0)
    expect(wrapper.text()).toContain('Reservas fechadas')
    expect(wrapper.text()).toContain('A disponibilidade mudou')
  })

  it('confirma uma vez e mostra o resumo, sem alterar sessão, persistir ou chamar backend', async () => {
    await setMockSession('student')
    const userBefore = JSON.stringify(useSessionStore().user)
    const cookieBefore = document.cookie
    const context = { ...getMockReservationForm(), college: 'Faculdade de teste' }
    const contextBefore = JSON.stringify(context)
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Sem API'))
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const localSpy = vi.spyOn(Storage.prototype, 'setItem')
    try {
      const wrapper = mount(NewReservationPage, { props: { context } })
      await wrapper.get('select').setValue('demo-south')
      const button = wrapper.get('button').element
      button.click()
      button.click()
      await nextTick()
      expect(useReservationsStore().studentReservations).toHaveLength(1)
      expect(wrapper.text()).toContain('Reserva de demonstração confirmada!')
      expect(wrapper.text()).toContain('Você já tem uma reserva para esta data.')
      expect(wrapper.get('dl').text()).toContain('Segunda-feira, 16 de novembro de 2026')
      expect(wrapper.get('dl').text()).toContain('Faculdade de teste')
      expect(wrapper.get('dl').text()).toContain('Parada de exemplo — Bairro Sul')
      expect(wrapper.get('button').attributes('disabled')).toBeDefined()
      expect(wrapper.text()).not.toMatch(/comprovante|QR Code/i)
      expect(JSON.stringify(context)).toBe(contextBefore)
      expect(JSON.stringify(useSessionStore().user)).toBe(userBefore)
      expect(document.cookie).toBe(cookieBefore)
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(xhrSpy).not.toHaveBeenCalled()
      expect(localSpy).not.toHaveBeenCalled()
      wrapper.unmount()
      const reopened = mount(NewReservationPage)
      expect(reopened.text()).toContain('Reserva de demonstração já confirmada')
      expect(reopened.get('dl').text()).toContain('Faculdade de teste')
    } finally { fetchSpy.mockRestore(); xhrSpy.mockRestore(); localSpy.mockRestore() }
  })

  it('oculta a confirmação ao trocar de aluno e limpa a seleção da conta anterior', async () => {
    await setMockSession('student')
    const wrapper = mount(NewReservationPage)
    await wrapper.get('select').setValue('demo-south')
    await wrapper.get('button').trigger('click')
    expect(wrapper.text()).toContain('Reserva de demonstração confirmada!')
    useSessionStore().user = { id: 'outro-aluno', name: 'Outro aluno', role: 'student' }
    await nextTick()
    expect(wrapper.text()).not.toContain('Reserva de demonstração confirmada!')
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('')
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.get('#reservation-confirmation-help').text()).toContain('faculdade cadastrada')
    await setMockSession('student')
    await nextTick()
    expect(wrapper.text()).toContain('Reserva de demonstração já confirmada')
  })

  it('integra /reservar ao layout protegido do aluno', async () => {
    await setMockSession('student')
    const router = createPortalRouter(createMemoryHistory())
    await router.push('/reservar')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router] } })
    await flushPromises()
    expect(wrapper.findComponent(NewReservationPage).exists()).toBe(true)
    expect(wrapper.findAll('main')).toHaveLength(1)
    expect(wrapper.findAll('nav[aria-label="Navegação do aluno"]')).toHaveLength(2)
    await wrapper.get('main select').setValue('demo-center')
    await wrapper.get('main button').trigger('click')
    await router.push('/')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Olá, Aluno!')
    expect(wrapper.get('main').text()).toContain('Praça de exemplo — Centro')
    await router.push('/reservar')
    await flushPromises()
    expect(wrapper.get('main').text()).toContain('Reserva de demonstração já confirmada')
    expect(useReservationsStore().studentReservations).toHaveLength(1)
  })
})
