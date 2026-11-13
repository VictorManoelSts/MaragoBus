import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { BaseSelect } from '@maragobus/shared'
import { useSessionStore } from '@maragobus/shared/auth/session'
import NewReservationPage from '../src/pages/NewReservationPage.vue'
import App from '../src/App.vue'
import { getMockReservationForm } from '../src/mocks/reservation-form'
import { getMockStudentHome } from '../src/mocks/student-home'
import { createPortalRouter } from '../src/router'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'

describe('Interface Fazer reserva', () => {
  it('apresenta título, descrição, data civil em português e identificação de demonstração', () => {
    const wrapper = mount(NewReservationPage)
    expect(wrapper.get('h1').text()).toBe('Fazer reserva')
    expect(wrapper.text()).toContain('Confira as informações da viagem e selecione seu ponto de embarque.')
    expect(wrapper.get('time').attributes('datetime')).toBe(getMockReservationForm().travelDate)
    expect(wrapper.get('time').text()).toBe('Segunda-feira, 16 de novembro de 2026')
    expect(wrapper.get('[role="status"]').text()).toContain('Dados de demonstração')
    expect(wrapper.text()).toContain('Não representam disponibilidade de viagem nem pontos reais cadastrados')
  })

  it('formata outra data do modelo sem deslocar o dia pelo fuso', () => {
    const wrapper = mount(NewReservationPage, { props: { context: { ...getMockReservationForm(), travelDate: '2026-11-17' } } })
    expect(wrapper.get('time').text()).toBe('Terça-feira, 17 de novembro de 2026')
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
    expect(wrapper.get('#reservation-confirmation-help').text()).toContain('Nenhuma reserva será criada')
    await button.trigger('click')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).not.toMatch(/reserva (concluída|criada com sucesso)|reservas (abertas|encerradas)/i)
  })

  it('não cria reservas, altera sessão, persiste seleção ou chama backend', async () => {
    await setMockSession('student')
    const userBefore = JSON.stringify(useSessionStore().user)
    const cookieBefore = document.cookie
    const context = getMockReservationForm()
    const contextBefore = JSON.stringify(context)
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Sem API'))
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const localSpy = vi.spyOn(Storage.prototype, 'setItem')
    try {
      const wrapper = mount(NewReservationPage, { props: { context } })
      await wrapper.get('select').setValue('demo-south')
      await wrapper.get('button').trigger('click')
      expect(JSON.stringify(context)).toBe(contextBefore)
      expect(JSON.stringify(useSessionStore().user)).toBe(userBefore)
      expect(document.cookie).toBe(cookieBefore)
      expect(getMockStudentHome()).toEqual({ currentReservation: null, futureReservation: null })
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(xhrSpy).not.toHaveBeenCalled()
      expect(localSpy).not.toHaveBeenCalled()
      wrapper.unmount()
      const reopened = mount(NewReservationPage)
      expect((reopened.get('select').element as HTMLSelectElement).value).toBe('')
    } finally { fetchSpy.mockRestore(); xhrSpy.mockRestore(); localSpy.mockRestore() }
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
    await router.push('/')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Olá, Aluno!')
    expect(wrapper.text()).toContain('Você não tem uma reserva atual para apresentar.')
  })
})
