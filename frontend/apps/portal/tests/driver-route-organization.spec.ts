import { DOMWrapper, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
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

async function assignCollege(select: Pick<DOMWrapper<HTMLSelectElement>, 'element' | 'setValue'>, driverId: string) {
  const row = new DOMWrapper(select.element.closest('li')!)
  await select.setValue(driverId)
  await button(row, 'Atribuir')!.trigger('click')
}

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
    const assign = button(first, 'Atribuir')!
    expect(assign.element.disabled).toBe(true)
    await first.get('select').setValue('driver-demo-1')
    expect(assign.element.disabled).toBe(false)
    expect(totals()).toEqual(['0/5', '0/30'])
    expect(useCollegeDistributionsStore().getDistribution(date)).toBeUndefined()
    const nextSelect = unassigned().findAll('select')[1]!
    await assign.trigger('click')
    expect(document.activeElement).toBe(nextSelect.element)
    expect(totals()).toEqual(['1/5', `${count}/30`])
    expect(rows('Motorista Demo 1').text()).toContain(name)
    expect(unassigned().findAll('select')).toHaveLength(4)
    expect(useCollegeDistributionsStore().getDistribution(date)?.history.map(change => change.type))
      .toEqual(['created', 'assigned'])

    const assignedRow = rows('Motorista Demo 1').get('li')
    const edit = assignedRow.get('button')
    expect(edit.text()).toBe('Editar atribuição')
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
    await assignCollege(organization.get('select'), 'mock-driver-test')
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
    const blockedPublish = button(organization, 'Publicar distribuição')!
    expect(blockedPublish.element.disabled).toBe(true)
    const reason = organization.get('#' + blockedPublish.attributes('aria-describedby'))
    expect(reason.text()).toContain('Atribua todas as faculdades')

    const selects = organization.findAll('select')
    await assignCollege(selects[0]!, 'driver-demo-1')
    expect(organization.text()).toContain('Rascunho')
    expect(button(organization, 'Publicar distribuição')?.element.disabled).toBe(true)
    expect(store.publish(date)).toBe('unassigned-colleges')
    for (const select of selects.slice(1)) await assignCollege(select, 'driver-demo-1')

    const publish = button(organization, 'Publicar distribuição')!
    expect(publish.element.disabled).toBe(false)
    expect(document.activeElement).toBe(publish.element)
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
    expect(organization.get('time:not(details time)').attributes('datetime')).toBe(openTime.toISOString())
    expect(organization.get('time:not(details time)').text()).toContain('11:00')
    expect(organization.get('time:not(details time)').element.parentElement?.textContent).toContain('Publicada por Motorista Demo 1')
    expect(organization.findAll('select')).toHaveLength(0)
    expect(button(organization, 'Editar atribuição')).toBeUndefined()
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
    expect(organization.find('time:not(details time)').exists()).toBe(false)
    expect(button(organization, 'Editar atribuição')).toBeDefined()
    expect(assignedNames()).toEqual(firstDriverRows)
    expect(totals()).toEqual(['5/5', '30/30'])
    expect(store.getDistribution(date)?.colleges).toEqual(assignments)
    expect(store.getDistribution(date)?.history.slice(-2)).toMatchObject([
      { type: 'published', author: { id: 'driver-demo-1' } },
      { type: 'reopened', author: { id: 'driver-demo-2' } },
    ])
  })

  it('publica sem reservas nem rascunho somente após confirmar e registra os dois eventos', async () => {
    vi.setSystemTime(openTime)
    await setMockSession('driver')
    const { organization, totals } = render()
    const store = useCollegeDistributionsStore()
    const publish = button(organization, 'Publicar distribuição')!
    expect(publish.element.disabled).toBe(false)
    await publish.trigger('click')
    expect(dialog().get('h2').text()).toBe('Publicar distribuição')
    expect(store.getDistribution(date)).toBeUndefined()
    await button(dialog(), 'Cancelar')!.trigger('click')
    expect(store.getDistribution(date)).toBeUndefined()
    await publish.trigger('click')
    await button(dialog(), 'Publicar distribuição')!.trigger('click')
    expect(totals()).toEqual(['0/0', '0/0'])
    expect(store.getDistribution(date)).toMatchObject({
      status: 'PUBLICADA',
      colleges: [],
      history: ['created', 'published'].map(type => ({
        type, author: { id: 'mock-driver-test' }, at: openTime.toISOString(),
      })),
    })
    expect(document.activeElement?.textContent).toContain('publicada com sucesso')
  })

  it('atualiza os totais da distribuição publicada após cancelamento e exige sessão de motorista', async () => {
    const reservation = await seedReservation()
    vi.setSystemTime(openTime)
    const store = useCollegeDistributionsStore()
    const { organization, rows, totals } = render()
    await assignCollege(organization.get('select'), 'mock-driver-test')
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
    await assignCollege(organization.get('select'), 'mock-driver-test')
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
    await assignCollege(organization.get('select'), 'mock-driver-test')
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
    await assignCollege(organization.get('select'), 'mock-driver-test')
    expect(store.publish(date)).toBe('published')
    await vi.advanceTimersByTimeAsync(0)
    expect(organization.text()).toContain('A distribuição está publicada')
    expect(organization.findAll('select, button:not(:disabled)').filter(item => item.text() !== 'Reabrir distribuição')).toHaveLength(0)
    expect(totals()).toEqual(['1/1', '1/1'])

    expect(store.reopen(date)).toBe('reopened')
    await vi.advanceTimersByTimeAsync(0)
    await button(organization, 'Editar atribuição')!.trigger('click')
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
    const publish = button(organization, 'Publicar distribuição')!
    expect(publish.element.disabled).toBe(true)
    expect(organization.get('#' + publish.attributes('aria-describedby')).text()).toContain('às 11h')
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

describe('Histórico de alterações da distribuição', () => {
  it('mantém indicadores, atribuições e histórico consistentes no fluxo completo pela página', async () => {
    const reservation = await seedReservation()
    vi.setSystemTime(openTime)
    const { organization, rows, totals } = render()
    const store = useCollegeDistributionsStore()
    const reservations = useReservationsStore()
    const historyTypes = () => store.getDistribution(date)?.history.map(change => change.type)

    await assignCollege(organization.get('select'), 'mock-driver-test')
    expect(totals()).toEqual(['1/1', '1/1'])

    const secondDriver = { id: 'other-driver', name: 'Outro Motorista', role: 'driver' as const }
    useSessionStore().user = secondDriver
    await nextTick()
    await rows('Motorista de Teste').get('button').trigger('click')
    await dialog().get('select').setValue(secondDriver.id)
    await button(dialog(), 'Transferir')!.trigger('click')
    expect(rows(secondDriver.name).text()).toContain(college)
    expect(totals()).toEqual(['1/1', '1/1'])

    await rows(secondDriver.name).get('button').trigger('click')
    await button(dialog(), 'Remover atribuição')!.trigger('click')
    expect(totals()).toEqual(['0/1', '0/1'])
    expect(button(organization, 'Publicar distribuição')?.element.disabled).toBe(true)

    await assignCollege(organization.get('select'), secondDriver.id)
    await button(organization, 'Publicar distribuição')!.trigger('click')
    await button(dialog(), 'Publicar distribuição')!.trigger('click')
    expect(store.getDistribution(date)?.status).toBe('PUBLICADA')
    expect(totals()).toEqual(['1/1', '1/1'])

    await button(organization, 'Reabrir distribuição')!.trigger('click')
    await button(dialog(), 'Reabrir distribuição')!.trigger('click')
    expect(store.getDistribution(date)?.status).toBe('RASCUNHO')
    expect(rows(secondDriver.name).text()).toContain(college)
    expect(totals()).toEqual(['1/1', '1/1'])
    const operations = ['created', 'assigned', 'transferred', 'removed', 'assigned', 'published', 'reopened']
    expect(historyTypes()).toEqual(operations)

    await setMockSession('student')
    expect(reservations.cancel(reservation.id)).toBe('cancelled')
    await setMockSession('driver')
    expect(totals()).toEqual(['1/1', '0/0'])
    expect(rows(secondDriver.name).text()).toContain('0 alunos')
    expect(historyTypes()).toEqual(operations)
    expect(organization.get('details summary').text()).toContain('7 alterações')
  })

  it('começa recolhido, mostra o estado vazio e isola a consulta por data e sessão', async () => {
    vi.setSystemTime(openTime)
    await setMockSession('driver')
    const store = useCollegeDistributionsStore()
    const { organization, dateInput } = render()
    const historyCard = () => organization.get('details')

    expect(historyCard().element.open).toBe(false)
    expect(historyCard().get('summary').text()).toContain('Histórico de alterações')
    expect(historyCard().get('summary').text()).toContain('0 alterações')
    expect(historyCard().text()).toContain('Nenhuma alteração registrada para esta data.')
    expect(historyCard().find('ol').exists()).toBe(false)

    await historyCard().get('summary').trigger('click')
    expect(historyCard().element.open).toBe(true)
    expect(store.publish(date)).toBe('published')
    await nextTick()
    expect(historyCard().element.open).toBe(true)
    expect(historyCard().get('summary').text()).toContain('2 alterações')
    expect(historyCard().get('ol').text()).toContain('Criação')
    expect(historyCard().get('ol').text()).toContain('Publicação')

    await dateInput.setValue('2026-11-17')
    expect(historyCard().element.open).toBe(false)
    expect(historyCard().text()).toContain('Nenhuma alteração registrada para esta data.')
    await dateInput.setValue(date)
    expect(historyCard().element.open).toBe(false)
    expect(historyCard().get('ol').text()).toContain('Criação')

    await dateInput.setValue('')
    expect(organization.find('details').exists()).toBe(false)
    await dateInput.setValue(date)
    await setMockSession('student')
    expect(organization.find('details').exists()).toBe(false)
  })

  it('consulta os seis eventos com autores, horários de Maceió e motoristas envolvidos', async () => {
    await seedReservation()
    vi.setSystemTime(openTime)
    const store = useCollegeDistributionsStore()
    const session = useSessionStore()
    const { organization } = render()
    const entries = () => organization.get('details ol').findAll('li')
    organization.get('details').element.open = true
    await assignCollege(organization.get('select'), 'mock-driver-test')

    const secondDriver = { id: 'other-driver', name: 'Outro Motorista', role: 'driver' as const }
    const thirdDriver = { id: 'route-driver', name: 'Motorista da Rota', role: 'driver' as const }
    session.user = secondDriver
    const transferTime = new Date('2026-11-16T14:15:00Z')
    vi.setSystemTime(transferTime)
    expect(store.transfer(date, college, thirdDriver)).toBe('transferred')
    const publicationTime = new Date('2026-11-16T14:30:00Z')
    vi.setSystemTime(publicationTime)
    expect(store.publish(date)).toBe('published')
    expect(store.reopen(date)).toBe('reopened')
    const removalTime = new Date('2026-11-16T14:20:00Z')
    vi.setSystemTime(removalTime)
    expect(store.remove(date, college)).toBe('removed')
    await nextTick()

    expect(organization.get('details summary').text()).toContain('6 alterações')
    const expected = [
      { label: 'Reabertura', at: publicationTime, local: '11:30', names: [secondDriver.name] },
      { label: 'Publicação', at: publicationTime, local: '11:30', names: [secondDriver.name] },
      { label: 'Remoção', at: removalTime, local: '11:20', names: [secondDriver.name, college, thirdDriver.name] },
      { label: 'Transferência', at: transferTime, local: '11:15', names: [secondDriver.name, college, 'Motorista de Teste', thirdDriver.name] },
      { label: 'Atribuição', at: openTime, local: '11:00', names: [college, 'Motorista de Teste'] },
      { label: 'Criação', at: openTime, local: '11:00', names: ['Motorista de Teste'] },
    ]
    expected.forEach(({ label, at, local, names }, index) => {
      const row = entries()[index]!
      expect(row.text()).toContain(label)
      for (const name of names) expect(row.text()).toContain(name)
      expect(row.get('time').attributes('datetime')).toBe(at.toISOString())
      expect(row.get('time').text()).toContain('16/11/2026')
      expect(row.get('time').text()).toContain(local)
    })

    vi.setSystemTime(new Date('2026-11-17T03:00:00Z'))
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()
    expect(organization.text()).toContain('A data selecionada já passou')
    expect(organization.get('details summary').text()).toContain('6 alterações')
    expect(entries()[0]?.text()).toContain('Reabertura')
  })
})
