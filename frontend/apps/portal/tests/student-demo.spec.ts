import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { nextTick } from 'vue'
import { applyDriverDemoPreference } from '@maragobus/shared/auth/driver-demo'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { selectStudentDemo } from '@maragobus/shared/auth/student-demo'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'
import StudentProfilePage from '../src/pages/StudentProfilePage.vue'
import HomePage from '../src/pages/HomePage.vue'
import { createPortalRouter } from '../src/router'
import { useReservationsStore } from '../src/stores/reservations'
import { useStudentDemoStore } from '../src/stores/student-demo'
import { useStudentNotificationsStore } from '../src/stores/student-notifications'
import { useStudentProfileStore } from '../src/stores/student-profile'
import { getReservationAvailability, getReservationWindow, getTransportDate } from '../src/utils/reservation-availability'

const credentials = { cpf: '90000000175', password: 'AlunoTeste!53' }
const driverCredentials = { cpf: '90000000418', password: 'MotoristaDemo!24' }
const monday = '2026-11-16'

const homeStates = [
  ['completo', '.mb-badge.mb-feedback--success', 'Confirmada'],
  ['aberta', '.mb-badge.mb-feedback--success', 'Reservas abertas'],
  ['cancelada', '.mb-badge.mb-feedback--danger', 'Cancelada'],
  ['prazo-encerrado', '.mb-alert.mb-feedback--warning', 'Reservas fechadas'],
  ['sem-reserva', '.mb-alert.mb-feedback--warning', 'Próxima abertura'],
  ['sem-transporte', '.mb-alert.mb-feedback--warning', 'Transporte interrompido'],
  ['suspensao-determinada', '.mb-alert.mb-feedback--warning', 'Retorno previsto em'],
  ['suspensao-indeterminada', '.mb-alert.mb-feedback--warning', 'Sem previsão de retorno'],
] as const

beforeEach(() => {
  vi.setSystemTime(new Date(monday + 'T12:00:00Z'))
})

afterEach(() => {
  selectStudentDemo(null)
  applyDriverDemoPreference('/login', '0')
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

it.each(homeStates)('identifica o cenário %s pelo texto e pela variante nos dois temas',
  async (scenario, selector, label) => {
    const pinia = createPinia()
    const router = createPortalRouter(createMemoryHistory(), pinia)
    await router.push('/demo-aluno?cenario=' + scenario)
    await useSessionStore(pinia).login(credentials)
    await router.push('/')
    const wrapper = mount(HomePage, { global: { plugins: [pinia, router] } })
    const root = document.documentElement
    const previousTheme = root.dataset.theme
    try {
      for (const theme of ['light', 'dark']) {
        root.dataset.theme = theme
        const feedback = wrapper.get(selector)
        expect(feedback.text()).toContain(label)
        if (selector.startsWith('.mb-alert')) {
          expect(feedback.get('svg').attributes('aria-hidden')).toBe('true')
        }
      }
      if (scenario === 'sem-reserva') {
        expect(wrapper.find('#current-reservation-title, #next-reservation-title').exists()).toBe(false)
      }
    } finally {
      wrapper.unmount()
      if (previousTheme === undefined) delete root.dataset.theme
      else root.dataset.theme = previousTheme
    }
  })

it('ativa pela rota e preenche o perfil, o histórico e os avisos do aluno autenticado', async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createPortalRouter(createMemoryHistory(), pinia)
  const session = useSessionStore()
  const reservations = useReservationsStore()
  await router.push('/demo-aluno')
  expect(router.currentRoute.value.name).toBe('login')
  expect(reservations.studentReservations).toEqual([])
  await expect(session.login(driverCredentials)).rejects.toThrow()
  await session.login(credentials)
  await router.push('/perfil')
  const profile = mount(StudentProfilePage, { global: { plugins: [router] } })
  expect(profile.findAll('dd').map(item => item.text())).toEqual([
    'Aluno de Teste', '900.000.001-75',
    'Faculdade de Demonstração', 'Sistemas de Informação', 'Presencial',
  ])
  expect(profile.get<HTMLInputElement>('input[type="email"]').element.value).toBe('aluno.demo@example.invalid')
  expect(profile.get<HTMLSelectElement>('select').element.value).toBe('demo-center')
  profile.unmount()

  const demo = useStudentDemoStore()
  const notices = useStudentNotificationsStore()
  const { currentReservation, futureReservation } = reservations.getHomeSummary(monday)
  expect(currentReservation?.status).toBe('confirmed')
  expect(futureReservation?.travelDate).toBe('2026-11-17')
  expect(reservations.getReceiptReservation(currentReservation!.id, demo.now())).toBeDefined()
  expect(reservations.getReceiptReservation(futureReservation!.id, demo.now())).toBeUndefined()
  const past = reservations.studentReservations.filter(item => item.travelDate < monday)
  expect(past.map(item => item.status)).toEqual(['confirmed', 'cancelled'])
  for (const item of reservations.studentReservations) {
    const { opensAt, closesAt } = getReservationWindow(item.travelDate)
    expect(Date.parse(item.confirmedAt)).toBeGreaterThanOrEqual(opensAt.getTime())
    expect(Date.parse(item.confirmedAt)).toBeLessThan(closesAt.getTime())
    expect(Date.parse(item.confirmedAt)).toBeLessThan(demo.now().getTime())
  }
  expect(notices.notifications.map(notice => notice.read).sort()).toEqual([false, true])
})

it('alterna a janela, a interrupção, o comprovante e o cancelamento pelas regras existentes', async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createPortalRouter(createMemoryHistory(), pinia)
  const demo = useStudentDemoStore()
  const store = useReservationsStore()
  const profile = useStudentProfileStore()
  await router.push('/demo-aluno?cenario=aberta')
  await useSessionStore().login(credentials)
  const request = {
    travelDate: monday,
    context: profile.reservationContext,
    boardingPointId: 'demo-center',
    closures: [],
  }
  expect(getReservationAvailability(demo.now()).status).toBe('open')
  const confirmed = store.confirm(request)
  expect(confirmed.status).toBe('confirmed')
  if (confirmed.status !== 'confirmed') throw new Error('Reserva de demonstração não criada')
  expect(store.getReceiptReservation(confirmed.reservation.id, demo.now())).toBeDefined()
  expect(store.cancel(confirmed.reservation.id)).toBe('cancelled')
  expect(store.confirm(request).status).toBe('duplicate')
  expect(store.getReceiptReservation(confirmed.reservation.id, demo.now())).toBeUndefined()

  await router.push('/demo-aluno?cenario=sem-transporte')
  expect(getReservationAvailability(demo.now(), demo.scenario!.closures).status).toBe('no-service')
  expect(store.confirm(request).status).toBe('unavailable')

  await router.push('/demo-aluno?cenario=prazo-encerrado')
  expect(getReservationAvailability(demo.now()).status).toBe('waiting')
  const locked = store.findConfirmed(monday)!
  expect(store.cancel(locked.id)).toBe('deadline-passed')
  expect(store.getReceiptReservation(locked.id, demo.now())).toBeDefined()
  expect(store.getReceiptReservation(locked.id, new Date('2026-11-17T03:00:00Z'))).toBeUndefined()

  await router.push('/demo-aluno?cenario=cancelada')
  const cancelled = store.findReservation(monday)!
  expect(cancelled.status).toBe('cancelled')
  expect(store.getReceiptReservation(cancelled.id, demo.now())).toBeUndefined()

  await router.push('/demo-aluno?cenario=sem-reserva')
  expect(store.getHomeSummary(monday)).toEqual({ currentReservation: null, futureReservation: null })
  expect(store.studentReservations).toEqual([])
})

it('preserva a sessão e os registros comuns e reativa o aluno sem os dados alterados', async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createPortalRouter(createMemoryHistory(), pinia)
  await setMockSession('student')
  const session = useSessionStore()
  const store = useReservationsStore()
  const profile = useStudentProfileStore()
  const notices = useStudentNotificationsStore()
  const request = {
    travelDate: monday, context: profile.reservationContext, boardingPointId: 'demo-center', closures: [],
  }
  expect(store.confirm(request).status).toBe('confirmed')
  const regular = store.findReservation(monday)!
  expect(profile.savePreferences({
    email: 'comum@example.invalid', phone: '(82) 91234-5678', boardingPointId: 'demo-north',
  })).toBe(true)
  notices.markAllAsRead()
  expect(notices.unreadCount).toBe(0)

  await router.push('/demo-aluno?cenario=aberta')
  expect(session.authenticated).toBe(false)
  await session.login(credentials)
  expect(store.studentReservations.some(item => item.id === regular.id)).toBe(false)
  expect(store.confirm(request).status).toBe('confirmed')
  expect(profile.preferences.email).toBe('aluno.demo@example.invalid')
  expect(profile.preferences.phone).toBe('')
  expect(profile.savePreferences({
    email: 'demo-editado@example.invalid', phone: '82987654321', boardingPointId: 'demo-south',
  })).toBe(true)
  notices.markAllAsRead()
  expect(notices.unreadCount).toBe(0)

  const reloadedPinia = createPinia()
  const reloaded = createPortalRouter(createMemoryHistory(), reloadedPinia)
  await reloaded.push('/')
  expect(useSessionStore(reloadedPinia).authenticated).toBe(true)
  expect(useReservationsStore(reloadedPinia).findReservation(monday)).toBeUndefined()
  expect(useStudentNotificationsStore(reloadedPinia).unreadCount).toBe(1)

  session.logout()
  expect(session.authenticated).toBe(false)
  await router.push('/demo-aluno?cenario=0')
  expect(session.authenticated).toBe(true)
  expect(store.studentReservations.map(item => item.id)).toEqual([regular.id])
  expect(profile.reservationContext.defaultBoardingPointId).toBe('demo-north')
  expect(profile.preferences.email).toBe('comum@example.invalid')
  expect(profile.preferences.phone).toBe('(82) 91234-5678')
  expect(notices.unreadCount).toBe(0)
  expect(profile.registration).toBeUndefined()

  await router.push('/demo-aluno?cenario=aberta')
  await session.login(credentials)
  expect(store.findReservation(monday)).toBeUndefined()
  expect(profile.reservationContext.defaultBoardingPointId).toBe('demo-center')
  expect(profile.preferences.email).toBe('aluno.demo@example.invalid')
  expect(profile.preferences.phone).toBe('')
  expect(notices.unreadCount).toBe(1)
})

it('mantém o cenário do motorista separado ao alternar na mesma aba', async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createPortalRouter(createMemoryHistory(), pinia)
  const session = useSessionStore()
  const store = useReservationsStore()
  await router.push('/demo-motorista')
  await session.login(driverCredentials)
  expect(store.listDriverReservations(monday)).toHaveLength(30)
  await router.push('/demo-aluno')
  await session.login(credentials)
  expect(store.listDriverReservations(monday)).toEqual([])
  expect(store.studentReservations).toHaveLength(4)
  await router.push('/demo-motorista')
  expect(session.user?.id).toBe('driver-demo-1')
  expect(store.listDriverReservations(monday)).toHaveLength(30)
  expect(store.studentReservations).toEqual([])
  expect(getTransportDate(useStudentDemoStore().now())).toBe(monday)
  expect(useStudentDemoStore().now().getTime()).toBe(Date.now())
})

it.each([
  ['suspensao-determinada', 'Retorno previsto em 17/11/2026'],
  ['suspensao-indeterminada', 'Sem previsão de retorno.'],
])('bloqueia a criação em %s e mantém as reservas e as rotas existentes', async (scenario, message) => {
  const pinia = createPinia()
  const router = createPortalRouter(createMemoryHistory(), pinia)
  const session = useSessionStore(pinia)
  const store = useReservationsStore(pinia)
  const demo = useStudentDemoStore(pinia)
  await router.push('/demo-aluno?cenario=' + scenario)
  expect(store.suspensionAt(demo.now())).toBeUndefined()
  await session.login(credentials)
  await router.push('/')

  const wrapper = mount(HomePage, { global: { plugins: [pinia, router] } })
  try {
    const alert = wrapper.get('[role="status"]:not(.sr-only)')
    expect(alert.text()).toContain('Suspensão administrativa')
    expect(alert.text()).toContain('Cenário demonstrativo')
    expect(alert.text()).toContain(message)
    expect(alert.text()).toContain('não pode fazer novas reservas')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).toContain('Ver comprovante')
    const before = [...store.studentReservations]
    expect(before).toHaveLength(3)
    expect(getReservationAvailability(demo.now()).status).toBe('open')
    expect(store.confirm({
      travelDate: '2026-11-17', context: useStudentProfileStore(pinia).reservationContext,
      boardingPointId: 'demo-center', closures: [],
    }).status).toBe('suspended')
    expect(store.studentReservations).toEqual(before)
    expect(store.getReceiptReservation(store.findConfirmed(monday)!.id, demo.now())).toBeDefined()

    for (const [path, name] of [['/perfil', 'profile'], ['/reservas', 'reservations'], ['/comprovante', 'receipt']]) {
      await router.push(path)
      expect(router.currentRoute.value.name).toBe(name)
    }
    await router.push('/demo-aluno?cenario=aberta')
    expect(store.suspensionAt(demo.now())).toBeUndefined()
    expect(store.studentReservations.every(item => item.id.includes('-aberta-'))).toBe(true)
    await router.push('/demo-aluno?cenario=0')
    await setMockSession('student')
    expect(store.suspensionAt(demo.now())).toBeUndefined()
    expect(store.studentReservations).toEqual([])
  } finally {
    wrapper.unmount()
  }
})

it('retira o aviso e libera a confirmação na virada da data civil em Maceió', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
  vi.setSystemTime(new Date(monday + 'T12:00:00Z'))
  const pinia = createPinia()
  const router = createPortalRouter(createMemoryHistory(), pinia)
  const demo = useStudentDemoStore(pinia)
  const store = useReservationsStore(pinia)
  await router.push('/demo-aluno?cenario=suspensao-determinada')
  const login = useSessionStore(pinia).login(credentials)
  await vi.advanceTimersByTimeAsync(1000)
  await login
  await router.push('/')
  const request = {
    travelDate: '2026-11-17', context: useStudentProfileStore(pinia).reservationContext,
    boardingPointId: 'demo-center', closures: [],
  }
  const before = [...store.studentReservations]
  await vi.advanceTimersByTimeAsync(Date.parse('2026-11-17T02:59:59.999Z') - demo.now().getTime())
  const wrapper = mount(HomePage, { global: { plugins: [pinia, router] } })
  try {
    expect(store.confirm(request).status).toBe('suspended')
    expect(wrapper.text()).toContain('Suspensão administrativa')
    expect(wrapper.find('form').exists()).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await nextTick()
    expect(demo.now().toISOString()).toBe('2026-11-17T03:00:00.000Z')
    expect(wrapper.text()).not.toContain('Suspensão administrativa')
    expect(wrapper.get('form').text()).toContain('Confirmar reserva')
    expect(store.studentReservations).toEqual(before)
    expect(store.confirm(request).status).toBe('confirmed')
    expect(store.studentReservations).toHaveLength(before.length + 1)
  } finally {
    wrapper.unmount()
  }
})
