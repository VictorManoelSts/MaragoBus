import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App.vue'
import { getMockReservationForm } from '../src/mocks/reservation-form'
import { createPortalRouter } from '../src/router'
import { useReservationsStore } from '../src/stores/reservations'
import { useWarningRequestsStore } from '../src/stores/warning-requests'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'

const historyPath = '/motorista/advertencias'

afterEach(() => {
  vi.useRealTimers()
  delete document.documentElement.dataset.theme
})

describe('Fluxo de solicitações de advertência do motorista', () => {
  it.each([false, true])('protege o histórico de quem não é motorista (aluno autenticado: %s)', async student => {
    if (student) await setMockSession('student')
    const router = createPortalRouter(createMemoryHistory())
    await router.push(historyPath)
    expect(router.currentRoute.value.path).toBe(student ? '/' : '/login')
  })

  it.each(['light', 'dark'])('valida, restaura o foco, envia e filtra advertências no tema %s', async theme => {
    document.documentElement.dataset.theme = theme
    vi.setSystemTime(new Date('2026-11-16T13:00:00Z'))
    await setMockSession('student')
    const reservations = useReservationsStore()
    const confirmation = reservations.confirm({
      travelDate: '2026-11-16',
      context: getMockReservationForm('mock-student-test'),
      boardingPointId: 'demo-center',
      closures: [],
    })
    if (confirmation.status !== 'confirmed') throw new Error(confirmation.status)
    await setMockSession('driver')
    const router = createPortalRouter(createMemoryHistory())
    await router.push('/motorista/reservas')
    const wrapper = mount(App, { attachTo: document.body, global: { plugins: [router] } })
    const body = new DOMWrapper(document.body)
    const action = wrapper.get<HTMLButtonElement>('main li button')
    const dialog = () => body.findAll('dialog[open]').at(-1)!
    const submit = () => dialog().get('form').trigger('submit')

    await wrapper.get('main summary').trigger('click')
    await action.trigger('click')
    const studentDialog = dialog()
    expect(studentDialog.classes()).toContain('mb-modal')
    expect(studentDialog.attributes('aria-modal')).toBe('true')
    expect(studentDialog.get('h2').attributes('id')).toBe(studentDialog.attributes('aria-labelledby'))
    expect(studentDialog.get('h2').text()).toBe('Dados do aluno')
    expect(studentDialog.findAll('dt').map(label => label.text()))
      .toEqual(['Nome', 'Faculdade', 'Telefone', 'Ponto de embarque'])
    expect(studentDialog.findAll('dd').map(value => value.text()))
      .toEqual(['Aluno de Teste', confirmation.reservation.college, 'Não informado', confirmation.reservation.boardingPoint])
    const requestWarning = () => studentDialog.get('footer button')
    expect(document.activeElement).toBe(studentDialog.get('[data-modal-close]').element)
    await studentDialog.trigger('keydown', { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(requestWarning().element)
    await requestWarning().trigger('click')
    expect(dialog().get('dd').text()).toBe('Aluno de Teste')
    expect(dialog().get('time').text()).toBe('16/11/2026')
    expect(document.activeElement).toBe(dialog().get('textarea').element)
    await dialog().get('textarea').setValue('   ')
    await submit()
    expect(dialog().get('[role="alert"]').text()).toBe('Informe o motivo da solicitação.')
    expect(dialog().get('[role="alert"]').classes()).toContain('mb-error')
    expect(dialog().get('textarea').attributes('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(dialog().get('textarea').element)
    expect(useWarningRequestsStore().ownRequests).toHaveLength(0)
    await dialog().get('footer button').trigger('click')
    expect(body.findAll('dialog[open]')).toHaveLength(1)
    expect(document.activeElement).toBe(requestWarning().element)
    await studentDialog.trigger('cancel')
    expect(body.find('dialog[open]').exists()).toBe(false)
    expect(document.activeElement).toBe(action.element)

    await action.trigger('click')
    await requestWarning().trigger('click')
    expect((dialog().get('textarea').element as HTMLTextAreaElement).value).toBe('')
    await dialog().get('textarea').setValue('  Motivo demonstrativo.  ')
    await submit()
    await flushPromises()
    expect(body.find('dialog[open]').exists()).toBe(false)
    expect(document.activeElement?.textContent).toContain('Solicitação de advertência enviada.')
    expect(wrapper.get('.mb-feedback--success').classes()).toContain('mb-alert')
    expect(reservations.listDriverReservations('2026-11-16')).toHaveLength(1)

    await action.trigger('click')
    await requestWarning().trigger('click')
    await dialog().get('textarea').setValue('Outro motivo')
    await submit()
    expect(dialog().get('[role="alert"]').text()).toContain('Já existe uma solicitação')
    expect(useWarningRequestsStore().ownRequests).toHaveLength(1)
    await dialog().get('button[aria-label="Fechar modal"]').trigger('click')

    await router.push(historyPath)
    await flushPromises()
    const main = wrapper.get('main')
    const status = main.get('select')
    expect(status.classes()).toContain('mb-control')
    expect(main.get('li .mb-card').find('.mb-badge').exists()).toBe(true)
    expect(main.get('li').text()).toContain('Aluno de Teste')
    expect(main.get('li').text()).toContain('Motivo demonstrativo.')
    expect(main.get('li').text()).toContain('Pendente')
    await status.setValue('PENDENTE')
    expect(main.findAll('li')).toHaveLength(1)
    for (const value of ['APROVADA', 'REJEITADA']) {
      await status.setValue(value)
      expect(main.get('[role="status"]').text()).toBe('Nenhuma solicitação para a situação selecionada.')
      expect(main.get('[role="status"]').classes()).toContain('text-muted')
      expect(main.findAll('li')).toHaveLength(0)
    }
    await status.setValue('all')
    expect(main.findAll('li')).toHaveLength(1)
    wrapper.unmount()
  })
})
