import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { applyDriverDemoPreference } from '@maragobus/shared/auth/driver-demo'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { selectStudentDemo } from '@maragobus/shared/auth/student-demo'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'
import StudentProfilePage from '../src/pages/StudentProfilePage.vue'
import { createPortalRouter } from '../src/router'
import { useReservationsStore } from '../src/stores/reservations'
import { useStudentDemoStore } from '../src/stores/student-demo'
import { useStudentNotificationsStore } from '../src/stores/student-notifications'
import { useStudentProfileStore } from '../src/stores/student-profile'
import { getReservationAvailability, getReservationWindow, getTransportDate } from '../src/utils/reservation-availability'

const credentials = { cpf: '90000000175', password: 'AlunoTeste!53' }
const driverCredentials = { cpf: '90000000418', password: 'MotoristaDemo!24' }
const monday = '2026-11-16'

beforeEach(() => {
  vi.setSystemTime(new Date(monday + 'T12:00:00Z'))
})

afterEach(() => {
  selectStudentDemo(null)
  applyDriverDemoPreference('/login', '0')
  vi.useRealTimers()
  vi.unstubAllEnvs()
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
