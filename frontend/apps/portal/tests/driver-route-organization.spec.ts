import { DOMWrapper, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyDriverDemoPreference } from '@maragobus/shared/auth/driver-demo'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'
import DriverReservationsPage from '../src/pages/DriverReservationsPage.vue'
import { getMockReservationForm } from '../src/mocks/reservation-form'
import { useCollegeDistributionsStore } from '../src/stores/college-distributions'
import { useReservationsStore } from '../src/stores/reservations'

const date = '2026-11-16'
const openTime = new Date('2026-11-16T14:00:00Z')
const college = 'Faculdade A'
const body = new DOMWrapper(document.body)
const dialog = () => body.get('dialog[open]')
const button = (scope: Pick<DOMWrapper<Element>, 'findAll'>, label: string) => scope.findAll('button')
  .find(item => item.text() === label)

afterEach(() => {
  vi.useRealTimers()
  history.replaceState(null, '', '/login?demo-motorista=0')
  applyDriverDemoPreference()
  history.replaceState(null, '', '/')
})

async function seedReservation() {
  vi.setSystemTime(new Date('2026-11-16T13:00:00Z'))
  await setMockSession('student')
  const result = useReservationsStore().confirm({
    travelDate: date, context: { ...getMockReservationForm(), college },
    boardingPointId: 'demo-center', closures: [],
  })
  if (result.status !== 'confirmed') throw new Error(result.status)
  await setMockSession('driver')
  return result.reservation
}

function render() {
  const wrapper = mount(DriverReservationsPage, { attachTo: document.body })
  const organization = wrapper.get('section[aria-labelledby="driver-route-organization"]')
  return {
    organization,
    totals: () => organization.findAll('[aria-live="polite"] dd').map(item => item.text()),
    rows: (driver: string) => organization.get(`ul[aria-label="Faculdades de ${driver}"]`),
    dateInput: wrapper.get('#driver-reservation-date'),
  }
}

describe('Organização de rotas', () => {
  it('usa as reservas e contas demonstrativas para atribuir, transferir e remover', async () => {
    vi.setSystemTime(openTime)
    history.replaceState(null, '', '/login?demo-motorista=1')
    applyDriverDemoPreference()
    const session = useSessionStore()
    await session.login({ cpf: '90000000418', password: 'MotoristaDemo!24' })
    const { organization, totals, rows } = render()
    expect(organization.findAll('h3').map(item => item.text())).toEqual([
      'Faculdades não atribuídas', 'Motorista Demo 1', 'Motorista Demo 2', 'Motorista Demo 3',
    ])
    expect(organization.findAll('select')).toHaveLength(5)
    expect(totals()).toEqual(['0/5', '0/30'])

    const unassigned = () => organization.get('ul[aria-label="Faculdades não atribuídas"]')
    const first = unassigned().get('li')
    const name = first.get('p').text()
    const count = first.findAll('p')[1]!.text().split(' ')[0]
    await first.get('select').setValue('driver-demo-1')
    expect(totals()).toEqual(['1/5', `${count}/30`])
    expect(rows('Motorista Demo 1').text()).toContain(name)
    expect(unassigned().findAll('select')).toHaveLength(4)
    expect(useCollegeDistributionsStore().getDistribution(date)?.history.map(change => change.type))
      .toEqual(['created', 'assigned'])

    const assignedRow = rows('Motorista Demo 1').get('li')
    const edit = assignedRow.get('button')
    expect(edit.text()).toBe('Transferir')
    expect(edit.attributes('aria-label')).toContain(name)
    expect(edit.find('svg').exists()).toBe(true)
    await edit.trigger('click')
    const transfer = dialog().get('select')
    expect(transfer.findAll('option').map(option => option.element.value))
      .toEqual(['', 'driver-demo-2', 'driver-demo-3'])
    await transfer.setValue('driver-demo-2')
    await dialog().get('footer button:last-child').trigger('click')
    expect(rows('Motorista Demo 2').text()).toContain(name)
    expect(totals()).toEqual(['1/5', `${count}/30`])

    await rows('Motorista Demo 2').get('button').trigger('click')
    await dialog().get('footer button:first-child').trigger('click')
    expect(unassigned().text()).toContain(name)
    expect(totals()).toEqual(['0/5', '0/30'])
  })

  it('recalcula os totais ao cancelar e mantém a faculdade atribuída com zero alunos', async () => {
    const reservation = await seedReservation()
    vi.setSystemTime(openTime)
    const { organization, rows, totals } = render()
    await organization.get('select').setValue('mock-driver-test')
    expect(totals()).toEqual(['1/1', '1/1'])
    await setMockSession('student')
    expect(useReservationsStore().cancel(reservation.id)).toBe('cancelled')
    await setMockSession('driver')
    expect(totals()).toEqual(['1/1', '0/0'])
    expect(rows('Motorista de Teste').text()).toContain('0 alunos')
    await rows('Motorista de Teste').get('button').trigger('click')
    await dialog().get('footer button').trigger('click')
    expect(totals()).toEqual(['0/0', '0/0'])
  })

  it('publica com confirmação, identifica o autor e permite que outro motorista reabra', async () => {
    vi.setSystemTime(openTime)
    history.replaceState(null, '', '/login?demo-motorista=1')
    applyDriverDemoPreference()
    const session = useSessionStore()
    await session.login({ cpf: '90000000418', password: 'MotoristaDemo!24' })
    const { organization, rows, totals } = render()
    const store = useCollegeDistributionsStore()
    expect(button(organization, 'Publicar distribuição')).toBeUndefined()

    const selects = organization.findAll('select')
    await selects[0]!.setValue('driver-demo-1')
    expect(organization.text()).toContain('Rascunho')
    expect(button(organization, 'Publicar distribuição')?.element.disabled).toBe(true)
    expect(store.publish(date)).toBe('unassigned-colleges')
    for (const select of selects.slice(1)) await select.setValue('driver-demo-1')

    const publish = button(organization, 'Publicar distribuição')!
    expect(publish.element.disabled).toBe(false)
    await publish.trigger('click')
    expect(dialog().get('h2').text()).toBe('Publicar distribuição')
    expect(store.getDistribution(date)?.status).toBe('RASCUNHO')
    expect(document.activeElement).toBe(dialog().get('[data-modal-close]').element)
    await dialog().get('[data-modal-close]').trigger('click')
    expect(document.activeElement).toBe(publish.element)

    await publish.trigger('click')
    await button(dialog(), 'Publicar distribuição')!.trigger('click')
    expect(body.find('dialog[open]').exists()).toBe(false)
    expect(organization.text()).toContain('Publicada')
    expect(document.activeElement?.textContent).toContain('publicada com sucesso')
    expect(organization.get('time').attributes('datetime')).toBe(openTime.toISOString())
    expect(organization.get('time').text()).toContain('11:00')
    expect(organization.get('time').element.parentElement?.textContent).toContain('Publicada por Motorista Demo 1')
    expect(organization.findAll('select')).toHaveLength(0)
    expect(button(organization, 'Transferir')).toBeUndefined()
    expect(totals()).toEqual(['5/5', '30/30'])
    const assignments = store.getDistribution(date)?.colleges
    const assignedNames = () => rows('Motorista Demo 1').findAll('li p:first-child').map(item => item.text())
    const firstDriverRows = assignedNames()

    await session.login({ cpf: '90000000507', password: 'MotoristaDemo!24' })
    await button(organization, 'Reabrir distribuição')!.trigger('click')
    expect(dialog().get('h2').text()).toBe('Reabrir distribuição')
    expect(store.getDistribution(date)?.status).toBe('PUBLICADA')
    await button(dialog(), 'Reabrir distribuição')!.trigger('click')
    expect(organization.text()).toContain('Rascunho')
    expect(document.activeElement?.textContent).toContain('reaberta com sucesso')
    expect(organization.find('time').exists()).toBe(false)
    expect(button(organization, 'Transferir')).toBeDefined()
    expect(assignedNames()).toEqual(firstDriverRows)
    expect(totals()).toEqual(['5/5', '30/30'])
    expect(store.getDistribution(date)?.colleges).toEqual(assignments)
    expect(store.getDistribution(date)?.history.slice(-2)).toMatchObject([
      { type: 'published', author: { id: 'driver-demo-1' } },
      { type: 'reopened', author: { id: 'driver-demo-2' } },
    ])
  })

  it('atualiza os totais da distribuição publicada após cancelamento e exige sessão de motorista', async () => {
    const reservation = await seedReservation()
    vi.setSystemTime(openTime)
    const store = useCollegeDistributionsStore()
    const { organization, rows, totals } = render()
    await organization.get('select').setValue('mock-driver-test')
    await setMockSession('student')
    expect(button(organization, 'Publicar distribuição')?.element.disabled ?? true).toBe(true)
    expect(store.publish(date)).toBe('driver-required')
    await setMockSession('driver')
    await button(organization, 'Publicar distribuição')!.trigger('click')
    await button(dialog(), 'Publicar distribuição')!.trigger('click')
    await setMockSession('student')
    expect(button(organization, 'Reabrir distribuição')).toBeUndefined()
    expect(store.reopen(date)).toBe('driver-required')
    expect(useReservationsStore().cancel(reservation.id)).toBe('cancelled')
    await setMockSession('driver')
    expect(store.getDistribution(date)?.status).toBe('PUBLICADA')
    expect(totals()).toEqual(['1/1', '0/0'])
    expect(rows('Motorista de Teste').text()).toContain('0 alunos')
  })

  it('revalida o horário ao confirmar e direciona o foco ao erro', async () => {
    await seedReservation()
    vi.useFakeTimers()
    vi.setSystemTime(openTime)
    const store = useCollegeDistributionsStore()
    const { organization } = render()
    await organization.get('select').setValue('mock-driver-test')
    await button(organization, 'Publicar distribuição')!.trigger('click')
    vi.setSystemTime(new Date('2026-11-17T03:00:00Z'))
    await button(dialog(), 'Publicar distribuição')!.trigger('click')
    expect(store.getDistribution(date)?.status).toBe('RASCUNHO')
    expect(body.find('dialog[open]').exists()).toBe(false)
    const feedback = organization.get('[role="alert"]')
    expect(feedback.text()).toContain('Não foi possível publicar a distribuição.')
    expect(feedback.element.contains(document.activeElement)).toBe(true)
  })

  it('fecha a confirmação de reabertura à meia-noite e mantém a distribuição publicada', async () => {
    await seedReservation()
    vi.useFakeTimers()
    vi.setSystemTime(openTime)
    const store = useCollegeDistributionsStore()
    const { organization, totals } = render()
    await organization.get('select').setValue('mock-driver-test')
    expect(store.publish(date)).toBe('published')
    await vi.advanceTimersByTimeAsync(0)
    vi.setSystemTime(new Date('2026-11-17T02:59:59Z'))
    document.dispatchEvent(new Event('visibilitychange'))
    await button(organization, 'Reabrir distribuição')!.trigger('click')
    expect(body.find('dialog[open]').exists()).toBe(true)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(body.find('dialog[open]').exists()).toBe(false)
    expect(button(organization, 'Reabrir distribuição')).toBeUndefined()
    expect(store.getDistribution(date)?.status).toBe('PUBLICADA')
    expect(organization.text()).toContain('Publicada')
    expect(totals()).toEqual(['1/1', '1/1'])
  })

  it('exibe somente leitura após publicação e após o fim da janela do rascunho', async () => {
    await seedReservation()
    vi.useFakeTimers()
    vi.setSystemTime(openTime)
    const store = useCollegeDistributionsStore()
    const { organization, totals } = render()
    await organization.get('select').setValue('mock-driver-test')
    expect(store.publish(date)).toBe('published')
    await vi.advanceTimersByTimeAsync(0)
    expect(organization.text()).toContain('A distribuição está publicada')
    expect(organization.findAll('select, button:not(:disabled)').filter(item => item.text() !== 'Reabrir distribuição')).toHaveLength(0)
    expect(totals()).toEqual(['1/1', '1/1'])

    expect(store.reopen(date)).toBe('reopened')
    await vi.advanceTimersByTimeAsync(0)
    await button(organization, 'Transferir')!.trigger('click')
    expect(body.find('dialog[open]').exists()).toBe(true)
    vi.setSystemTime(new Date('2026-11-17T02:59:59Z'))
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(1_000)
    expect(organization.text()).toContain('A data selecionada já passou')
    expect(organization.findAll('select, button:not(:disabled)').filter(item => item.text() !== 'Reabrir distribuição')).toHaveLength(0)
    expect(body.find('dialog[open]').exists()).toBe(false)
    expect(totals()).toEqual(['1/1', '1/1'])
  })

  it('só libera a atribuição a um motorista na data selecionada a partir das 11h', async () => {
    await seedReservation()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-16T13:59:59Z'))
    const { organization, dateInput, totals } = render()
    expect(organization.text()).toContain('às 11h')
    expect(organization.find('select').exists()).toBe(false)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(totals()).toEqual(['0/1', '0/1'])
    expect(organization.find('select').exists()).toBe(true)
    await dateInput.setValue('2026-11-17')
    expect(organization.text()).toContain('data selecionada é futura')
    expect(organization.find('select').exists()).toBe(false)
    await dateInput.setValue('2026-11-13')
    expect(organization.text()).toContain('não tem distribuição registrada')
    expect(organization.find('select').exists()).toBe(false)
    await dateInput.setValue(date)
    await setMockSession('student')
    expect(organization.text()).toContain('Entre como motorista')
    expect(organization.find('select').exists()).toBe(false)
    expect(useCollegeDistributionsStore().getDistribution(date)).toBeUndefined()
  })
})
