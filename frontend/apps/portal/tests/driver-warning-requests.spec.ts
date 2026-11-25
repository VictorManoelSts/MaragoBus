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

afterEach(() => { vi.useRealTimers() })

describe('Fluxo de solicitações de advertência do motorista', () => {
  it.each([false, true])('protege o histórico de quem não é motorista (aluno autenticado: %s)', async student => {
    if (student) await setMockSession('student')
    const router = createPortalRouter(createMemoryHistory())
    await router.push(historyPath)
    expect(router.currentRoute.value.path).toBe(student ? '/' : '/login')
  })

  it('abre pela reserva, valida, restaura o foco ao voltar, envia e filtra no histórico', async () => {
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
    const dialog = () => body.get('dialog[open]')
    const submit = () => dialog().get('form').trigger('submit')

    action.element.focus()
    await action.trigger('click')
    expect(dialog().get('dd').text()).toBe('Aluno de Teste')
    expect(dialog().get('time').text()).toBe('16/11/2026')
    expect(document.activeElement).toBe(dialog().get('textarea').element)
    await dialog().get('textarea').setValue('   ')
    await submit()
    expect(dialog().get('[role="alert"]').text()).toBe('Informe o motivo da solicitação.')
    expect(dialog().get('textarea').attributes('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(dialog().get('textarea').element)
    expect(useWarningRequestsStore().ownRequests).toHaveLength(0)
    await dialog().get('button[aria-label="Fechar modal"]').trigger('click')
    expect(body.find('dialog[open]').exists()).toBe(false)
    expect(document.activeElement).toBe(action.element)

    await action.trigger('click')
    expect((dialog().get('textarea').element as HTMLTextAreaElement).value).toBe('')
    await dialog().get('textarea').setValue('  Motivo demonstrativo.  ')
    await submit()
    expect(body.find('dialog[open]').exists()).toBe(false)
    expect(document.activeElement?.textContent).toContain('Solicitação de advertência enviada.')
    expect(reservations.listDriverReservations('2026-11-16')).toHaveLength(1)

    await action.trigger('click')
    await dialog().get('textarea').setValue('Outro motivo')
    await submit()
    expect(dialog().get('[role="alert"]').text()).toContain('Já existe uma solicitação')
    expect(useWarningRequestsStore().ownRequests).toHaveLength(1)
    await dialog().get('button[aria-label="Fechar modal"]').trigger('click')

    await router.push(historyPath)
    await flushPromises()
    const main = wrapper.get('main')
    const status = main.get('select')
    expect(main.get('li').text()).toContain('Aluno de Teste')
    expect(main.get('li').text()).toContain('Motivo demonstrativo.')
    expect(main.get('li').text()).toContain('Pendente')
    await status.setValue('PENDENTE')
    expect(main.findAll('li')).toHaveLength(1)
    for (const value of ['APROVADA', 'REJEITADA']) {
      await status.setValue(value)
      expect(main.get('[role="status"]').text()).toBe('Nenhuma solicitação para a situação selecionada.')
      expect(main.findAll('li')).toHaveLength(0)
    }
    await status.setValue('all')
    expect(main.findAll('li')).toHaveLength(1)
  })
})
