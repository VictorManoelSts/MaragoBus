import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createMemoryHistory } from 'vue-router'
import { useSessionStore } from '@maragobus/shared/auth/session'
import App from '../src/App.vue'
import { getMockReservationForm } from '../src/mocks/reservation-form'
import { createPortalRouter } from '../src/router'
import { useReservationsStore } from '../src/stores/reservations'
import { getReceiptAvailability } from '../src/utils/reservation-receipt'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'

const travelDate = '2026-11-17'

function clock(instant: string) {
  vi.setSystemTime(new Date(instant))
}

function confirm(date = travelDate) {
  clock(`${date}T13:00:00Z`)
  const store = useReservationsStore()
  const confirmed = store.confirm({
    travelDate: date, boardingPointId: 'demo-center', closures: [],
    context: getMockReservationForm('mock-student-test'),
  })
  if (confirmed.status !== 'confirmed') throw new Error('Falha na reserva de teste')
  return confirmed.reservation.id
}

async function page(path = '/') {
  const router = createPortalRouter(createMemoryHistory())
  await router.push(path)
  await router.isReady()
  return mount(App, { global: { plugins: [router] } })
}

function openDialog() {
  return document.querySelector('dialog[open]')
}

describe('Comprovante de reserva', () => {
  beforeEach(async () => { await setMockSession('student') })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it.each([
    ['2026-11-17T02:59:59.999Z', 'future'],
    ['2026-11-17T03:00:00.000Z', 'available'],
    ['2026-11-17T20:00:00.000Z', 'available'],
    ['2026-11-18T02:59:59.999Z', 'available'],
    ['2026-11-18T03:00:00.000Z', 'unavailable'],
  ])('em %s calcula %s no fuso de Maceió', (instant, state) => {
    expect(getReceiptAvailability({ travelDate, status: 'confirmed' }, new Date(instant))).toBe(state)
    expect(getReceiptAvailability({ travelDate, status: 'cancelled' }, new Date(instant))).toBe('unavailable')
  })

  it('preserva o comprovante atual e o aviso futuro após as 17h', async () => {
    const id = confirm()
    clock('2026-11-17T20:00:00Z')
    expect(useReservationsStore().confirm({
      travelDate: '2026-11-18', boardingPointId: 'demo-south', closures: [],
      context: getMockReservationForm('mock-student-test'),
    }).status).toBe('confirmed')
    const wrapper = await page()
    expect(wrapper.get('main section').element.lastElementChild?.textContent).toContain('a partir das 00h')
    expect(wrapper.get('main time').attributes('datetime')).toBe(travelDate)
    await wrapper.get('main button').trigger('click')
    const dialog = openDialog()
    expect(dialog?.querySelector('img')?.alt).toBe('MaragoBus')
    expect(dialog?.textContent).toContain('Comprovante demonstrativo — sem validade para embarque')
    expect(dialog?.textContent).toContain('Aluno de Teste')
    expect(dialog?.textContent).toContain('Faculdade de Demonstração')
    expect(dialog?.textContent).toContain('Praça de exemplo — Centro')
    expect(dialog?.textContent).toContain(id)
    expect(dialog?.textContent).toContain('Confirmada')
    expect(dialog?.querySelector('time')?.dateTime).toBe(travelDate)
  })

  it('habilita a ação automaticamente à meia-noite e fecha o modal quando o dia expira', async () => {
    confirm()
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    clock('2026-11-17T02:59:59.999Z')
    const wrapper = await page('/reservas')
    expect(wrapper.get('main').text()).toContain('a partir das 00h')
    expect(wrapper.findAll('main button').map(button => button.text())).toEqual(['Cancelar reserva'])
    vi.advanceTimersByTime(1)
    await nextTick()
    await wrapper.findAll('main button').find(button => button.text() === 'Ver comprovante')!.trigger('click')
    expect(openDialog()).not.toBeNull()
    clock('2026-11-18T02:59:00.000Z')
    vi.advanceTimersByTime(60_000)
    await nextTick()
    expect(openDialog()).toBeNull()
    expect(wrapper.findAll('main button')).toHaveLength(0)
  })

  it('revalida ao clicar em um botão desatualizado depois da virada do dia', async () => {
    confirm()
    const wrapper = await page()
    const button = wrapper.get('main button')
    clock('2026-11-18T03:00:00Z')
    await button.trigger('click')
    expect(openDialog()).toBeNull()
    expect(wrapper.get('main').text()).toContain('O comprovante desta reserva está indisponível.')
  })

  it('limita a consulta por ID ao aluno e elimina o acesso ao cancelar ou trocar de sessão', async () => {
    const id = confirm()
    const store = useReservationsStore()
    const wrapper = await page()
    await wrapper.get('main button').trigger('click')
    expect(openDialog()).not.toBeNull()

    useSessionStore().user = { id: 'outro-aluno', name: 'Outro aluno', role: 'student' }
    await nextTick()
    expect(store.getReceiptReservation(id, new Date())).toBeUndefined()
    expect(openDialog()).toBeNull()
    expect(document.body.textContent).not.toContain(id)

    await setMockSession('student')
    await flushPromises()
    await wrapper.get('main button').trigger('click')
    expect(store.cancel(id)).toBe('cancelled')
    await nextTick()
    expect(store.getReceiptReservation(id, new Date())).toBeUndefined()
    expect(openDialog()).toBeNull()
    expect(wrapper.find('main button').exists()).toBe(false)
  })
})
