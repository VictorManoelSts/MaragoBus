import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick } from 'vue'
import type { App as VueApp } from 'vue'
import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { createPortalRouter } from '../../../apps/portal/src/router'
import { createAdminRouter } from '../../../apps/admin/src/router'
import PortalApp from '../../../apps/portal/src/App.vue'
import AdminApp from '../../../apps/admin/src/App.vue'
import { authNavigation } from '../src/auth/navigation'
import { authService } from '../src/auth/service'
import { useSessionStore } from '../src/auth/session'
import { mountAfterNavigation, syncSessionAccess } from '../src/auth/initialization'
import type { AuthRole, SessionUser } from '../src/auth/contracts'

const students = ['/', '/comprovante', '/reservar', '/reservas', '/notificacoes', '/perfil']
const drivers = ['/motorista/reservas', '/motorista/advertencias', '/motorista/perfil']
const administrators = ['/', '/alunos', '/motoristas', '/faculdades', '/pontos-embarque', '/advertencias', '/perfil', '/cursos', '/cursos-ofertados', '/reservas']
const roles = ['student', 'driver', 'admin'] as const
const applications: VueApp[] = []
const cleanups: (() => void)[] = []

function cookie(role: AuthRole | null) {
  document.cookie = role
    ? `maragobus_mock_session=mock-${role}-test; Path=/`
    : 'maragobus_mock_session=; Path=/; Max-Age=0'
}

function application(target: 'portal' | 'admin') {
  const pinia = createPinia()
  const router = target === 'portal'
    ? createPortalRouter(createMemoryHistory(), pinia)
    : createAdminRouter(createMemoryHistory(), pinia)
  const external = vi.spyOn(authNavigation, 'openExternal').mockImplementation(() => {})
  return { pinia, router, external, session: useSessionStore(pinia) }
}

afterEach(() => {
  cleanups.splice(0).forEach(stop => stop())
  applications.splice(0).forEach(app => app.unmount())
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('Acesso direto sem autenticação', () => {
  it('permite o login único sem sessão', async () => {
    const { router, pinia, session, external } = application('portal')
    await router.push('/login')
    const wrapper = mount(PortalApp, { global: { plugins: [pinia, router] } })
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Bem-vindo')
    expect(session.ready).toBe(true)
    expect(session.authenticated).toBe(false)
    expect(external).not.toHaveBeenCalled()
  })

  it.each([...students, ...drivers])('bloqueia %s no Portal e renderiza apenas login', async path => {
    const { router, pinia, external } = application('portal')
    await router.push(path)
    expect(router.currentRoute.value.path).toBe('/login')
    const wrapper = mount(PortalApp, { global: { plugins: [pinia, router] } })
    await flushPromises()
    expect(wrapper.find('nav, aside').exists()).toBe(false)
    expect(wrapper.get('h1').text()).toBe('Bem-vindo')
    expect(external).not.toHaveBeenCalled()
  })

  it.each(administrators)('bloqueia %s no Admin com um único redirecionamento externo', async path => {
    const { router, external } = application('admin')
    await router.push(path)
    expect(router.currentRoute.value.matched).toHaveLength(0)
    expect(external).toHaveBeenCalledExactlyOnceWith('http://localhost:5173/login')
  })
})

describe.each(roles)('Permissões do perfil %s', role => {
  it.each([...students, ...drivers])('aplica o perfil restaurado ao acessar %s no Portal', async path => {
    cookie(role)
    const { router, external, session } = application('portal')
    await router.push(path)
    expect(session.user?.role).toBe(role)
    if (role === 'admin') {
      expect(router.currentRoute.value.matched).toHaveLength(0)
      expect(external).toHaveBeenCalledExactlyOnceWith('http://localhost:5174/')
    } else {
      const allowed = role === 'student' ? students : drivers
      expect(router.currentRoute.value.path).toBe(allowed.includes(path) ? path : allowed[0])
      expect(router.currentRoute.value.meta.allowedRoles).toEqual([role])
      expect(external).not.toHaveBeenCalled()
    }
  })

  it.each(administrators)('aplica o perfil restaurado ao acessar %s no Admin', async path => {
    cookie(role)
    const { router, external, session } = application('admin')
    await router.push(path)
    expect(session.user?.role).toBe(role)
    if (role === 'admin') {
      expect(router.currentRoute.value.path).toBe(path)
      expect(router.currentRoute.value.meta.allowedRoles).toEqual(['admin'])
      expect(external).not.toHaveBeenCalled()
    } else {
      expect(router.currentRoute.value.matched).toHaveLength(0)
      expect(external).toHaveBeenCalledExactlyOnceWith(role === 'student'
        ? 'http://localhost:5173/' : 'http://localhost:5173/motorista/reservas')
    }
  })

  it('retira o usuário com sessão válida do login e o encaminha à própria área', async () => {
    cookie(role)
    const { router, external } = application('portal')
    await router.push('/login')
    if (role === 'admin') expect(external).toHaveBeenCalledExactlyOnceWith('http://localhost:5174/')
    else expect(router.currentRoute.value.path).toBe(role === 'student' ? '/' : '/motorista/reservas')
    expect(router.currentRoute.value.name).not.toBe('login')
  })
})

describe('Compatibilidade, catálogo e fallback', () => {
  const legacy = [
    { from: '/historico', to: '/reservas', role: 'student' },
    { from: '/avisos', to: '/notificacoes', role: 'student' },
    { from: '/motorista', to: '/motorista/reservas', role: 'driver' },
    { from: '/motorista/faculdades', to: '/motorista/reservas', role: 'driver' },
    { from: '/motorista/passageiros', to: '/motorista/reservas', role: 'driver' },
    { from: '/motorista/resumo', to: '/motorista/reservas', role: 'driver' },
  ] as const

  it.each(legacy)('mantém query e hash na compatibilidade autorizada de $from', async ({ from, to, role }) => {
    cookie(role)
    const { router, session, external } = application('portal')
    await router.push(from + '?origem=legado#conteudo')
    expect(router.currentRoute.value.fullPath).toBe(to + '?origem=legado#conteudo')
    expect(router.currentRoute.value.meta.allowedRoles).toEqual([role])
    expect(session.user?.role).toBe(role)
    expect(external).not.toHaveBeenCalled()
  })
  it.each(legacy)('bloqueia a compatibilidade $from sem sessão', async ({ from }) => {
    const { router, pinia, external } = application('portal')
    await router.push(from)
    expect(router.currentRoute.value.path).toBe('/login')
    const wrapper = mount(PortalApp, { global: { plugins: [pinia, router] } })
    await flushPromises()
    expect(wrapper.find('nav, aside').exists()).toBe(false)
    expect(wrapper.get('h1').text()).toBe('Bem-vindo')
    expect(external).not.toHaveBeenCalled()
  })
  it.each(legacy)('bloqueia a compatibilidade $from para outro perfil', async ({ from, role }) => {
    const otherRole = role === 'student' ? 'driver' : 'student'
    cookie(otherRole)
    const { router, session, external } = application('portal')
    await router.push(from)
    expect(router.currentRoute.value.path).toBe(otherRole === 'driver' ? '/motorista/reservas' : '/')
    expect(router.currentRoute.value.meta.allowedRoles).toEqual([otherRole])
    expect(session.user?.role).toBe(otherRole)
    expect(external).not.toHaveBeenCalled()
  })
  it.each(['/motorista', '/motorista/faculdades'])('encaminha o administrador ao Admin ao acessar %s', async path => {
    cookie('admin')
    const { router, session, external } = application('portal')
    await router.push(path)
    expect(session.user?.role).toBe('admin')
    expect(router.currentRoute.value.matched).toHaveLength(0)
    expect(external).toHaveBeenCalledExactlyOnceWith('http://localhost:5174/')
  })
  it.each(['portal', 'admin'] as const)('mantém Design System público apenas de desenvolvimento no %s', async target => {
    const restore = vi.spyOn(authService, 'restore')
    const { router, pinia, external } = application(target)
    await router.push('/design-system')
    const wrapper = mount(target === 'portal' ? PortalApp : AdminApp, { global: { plugins: [pinia, router] } })
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Design System')
    expect(restore).not.toHaveBeenCalled()
    expect(external).not.toHaveBeenCalled()
  })
  it.each([null, ...roles])('resolve caminho inexistente no Portal sem loop com perfil %s', async role => {
    cookie(role)
    const { router, external } = application('portal')
    const navigations = vi.fn()
    router.afterEach(navigations)
    await router.push('/rota-inexistente')
    if (role === 'admin') expect(external).toHaveBeenCalledExactlyOnceWith('http://localhost:5174/')
    else expect(router.currentRoute.value.path).toBe(role === 'driver' ? '/motorista/reservas' : role ? '/' : '/login')
    expect(navigations).toHaveBeenCalledTimes(1)
  })
  it.each([null, ...roles])('resolve caminho inexistente no Admin sem loop com perfil %s', async role => {
    cookie(role)
    const { router, external } = application('admin')
    await router.push('/rota-inexistente')
    if (role === 'admin') expect(router.currentRoute.value.path).toBe('/')
    else expect(external).toHaveBeenCalledExactlyOnceWith(role === 'driver'
      ? 'http://localhost:5173/motorista/reservas' : role ? 'http://localhost:5173/' : 'http://localhost:5173/login')
  })
})

describe('Restauração, recarregamento e revogação', () => {
  it.each([
    { target: 'portal', role: 'student', path: '/reservas' },
    { target: 'portal', role: 'driver', path: '/motorista/perfil' },
    { target: 'admin', role: 'admin', path: '/alunos' },
  ] as const)('restaura $role em router/store novos após recarregar $path', async ({ target, role, path }) => {
    cookie(role)
    const first = application(target)
    await first.router.push(path)
    const refreshed = application(target)
    expect(refreshed.session.ready).toBe(false)
    expect(refreshed.session.user).toBeNull()
    await refreshed.router.push(path)
    expect(refreshed.session.ready).toBe(true)
    expect(refreshed.session.user).toEqual(first.session.user)
    expect(refreshed.router.currentRoute.value.path).toBe(path)
  })

  it.each(['portal', 'admin'] as const)('rejeita cookie desconhecido no %s', async target => {
    document.cookie = 'maragobus_mock_session=desconhecido; Path=/'
    const { router, session, external } = application(target)
    await router.push('/')
    expect(session.authenticated).toBe(false)
    expect(document.cookie).toBe('')
    if (target === 'portal') expect(router.currentRoute.value.path).toBe('/login')
    else expect(external).toHaveBeenCalledExactlyOnceWith('http://localhost:5173/login')
  })

  it('invalida estado inconsistente e falhas de restauração sem renderizar a página solicitada', async () => {
    const restore = vi.spyOn(authService, 'restore').mockResolvedValue({ id: 'test', name: '', role: 'unknown' } as unknown as SessionUser)
    const logout = vi.spyOn(authService, 'logout')
    const { router, session } = application('portal')
    await router.push('/reservas')
    expect(router.currentRoute.value.path).toBe('/login')
    expect(session.user).toBeNull()
    expect(logout).toHaveBeenCalled()
    restore.mockRejectedValue(new Error('Falha de leitura'))
    await router.push('/perfil')
    expect(router.currentRoute.value.path).toBe('/login')
    expect(session.authenticated).toBe(false)
  })

  it('aguarda uma única restauração compartilhada antes de montar conteúdo protegido', async () => {
    let resolve!: (user: SessionUser) => void
    const restore = vi.spyOn(authService, 'restore').mockImplementation(() => new Promise(done => { resolve = done }))
    const pinia = createPinia()
    const history = createMemoryHistory()
    history.push('/reservas')
    const router = createPortalRouter(history, pinia)
    const session = useSessionStore(pinia)
    const root = document.createElement('div')
    root.id = 'app'
    document.body.append(root)
    cleanups.push(syncSessionAccess(pinia, router))
    const app = createApp(PortalApp).use(pinia).use(router)
    const mounted = mountAfterNavigation(app, router)
    await flushPromises()
    expect(root.innerHTML).toBe('')
    expect(session.ready).toBe(false)
    expect(router.currentRoute.value.matched).toHaveLength(0)
    expect(restore).toHaveBeenCalledTimes(1)
    resolve({ id: 'mock-student-test', name: 'Aluno de Teste', role: 'student' })
    await mounted
    applications.push(app)
    expect(root.textContent).toContain('Minhas reservas')
    expect(root.textContent).not.toContain('Perfil do motorista')
  })

  it('não monta nenhuma página do Admin antes do redirecionamento externo inicial', async () => {
    const { router, pinia, external } = application('admin')
    const root = document.createElement('div')
    root.id = 'app'
    document.body.append(root)
    const app = createApp(AdminApp).use(pinia).use(router)
    const mountSpy = vi.spyOn(app, 'mount')
    await mountAfterNavigation(app, router)
    expect(mountSpy).not.toHaveBeenCalled()
    expect(root.innerHTML).toBe('')
    expect(external).toHaveBeenCalledExactlyOnceWith('http://localhost:5173/login')
  })

  it('não renderiza a página de aluno enquanto restaura uma sessão de motorista', async () => {
    let resolve!: (user: SessionUser) => void
    const driver: SessionUser = { id: 'mock-driver-test', name: 'Motorista de Teste', role: 'driver' }
    vi.spyOn(authService, 'restore').mockResolvedValue(driver)
      .mockImplementationOnce(() => new Promise(done => { resolve = done }))
    const { router, pinia } = application('portal')
    const root = document.createElement('div')
    root.id = 'app'
    document.body.append(root)
    const app = createApp(PortalApp).use(pinia).use(router)
    const mounted = mountAfterNavigation(app, router)
    await flushPromises()
    expect(root.innerHTML).toBe('')
    resolve(driver)
    await mounted
    applications.push(app)
    expect(router.currentRoute.value.path).toBe('/motorista/reservas')
    expect(root.querySelector('main h1')?.textContent).toBe('Reservas')
    expect(root.textContent).not.toContain('Acompanhe suas reservas de transporte universitário.')
  })

  it('aguarda login pendente antes de avaliar o perfil na navegação concorrente', async () => {
    let resolve!: (user: SessionUser) => void
    vi.spyOn(authService, 'login').mockImplementation(() => new Promise(done => { resolve = done }))
    const { router, session } = application('portal')
    const login = session.login({ cpf: '90000000256', password: 'MotoristaTeste!53' })
    const navigation = router.push('/motorista/perfil')
    await flushPromises()
    expect(router.currentRoute.value.matched).toHaveLength(0)
    cookie('driver')
    resolve({ id: 'mock-driver-test', name: 'Motorista de Teste', role: 'driver' })
    await login
    await navigation
    expect(router.currentRoute.value.path).toBe('/motorista/perfil')
  })

  it('não aceita uma restauração antiga que termine após o logout', async () => {
    let resolve!: (user: SessionUser) => void
    vi.spyOn(authService, 'restore').mockResolvedValue(null)
      .mockImplementationOnce(() => new Promise(done => { resolve = done }))
    const { router, session } = application('portal')
    const navigation = router.push('/reservas')
    await flushPromises()
    session.logout()
    resolve({ id: 'mock-student-test', name: 'Aluno de Teste', role: 'student' })
    await navigation
    expect(router.currentRoute.value.path).toBe('/login')
    expect(session.authenticated).toBe(false)
  })

  it('mantém logout e bloqueia acesso direto e recarregamento posteriores', async () => {
    cookie('student')
    const { router, pinia, session } = application('portal')
    await router.push('/perfil')
    const wrapper = mount(PortalApp, { global: { plugins: [pinia, router] } })
    await flushPromises()
    session.logout()
    await nextTick()
    expect(wrapper.find('nav, aside, h1').exists()).toBe(false)
    await router.push('/reservas')
    expect(router.currentRoute.value.path).toBe('/login')
    const refreshed = application('portal')
    await refreshed.router.push('/perfil')
    expect(refreshed.router.currentRoute.value.path).toBe('/login')
  })

  it('oculta a área e revalida a rota quando outra aplicação encerra a sessão', async () => {
    cookie('driver')
    const { router, pinia, session } = application('portal')
    await router.push('/motorista/reservas')
    const wrapper = mount(PortalApp, { global: { plugins: [pinia, router] } })
    await flushPromises()
    vi.useFakeTimers()
    cleanups.push(syncSessionAccess(pinia, router))
    await flushPromises()
    cookie(null)
    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()
    expect(session.authenticated).toBe(false)
    expect(router.currentRoute.value.path).toBe('/login')
    expect(wrapper.text()).not.toContain('Consulte futuramente a quantidade')
    expect(wrapper.find('nav').exists()).toBe(false)
  })

  it('revalida o Admin ao recuperar foco após troca do perfil no cookie compartilhado', async () => {
    cookie('admin')
    const { router, pinia, external } = application('admin')
    await router.push('/alunos')
    const wrapper = mount(AdminApp, { global: { plugins: [pinia, router] } })
    await flushPromises()
    cleanups.push(syncSessionAccess(pinia, router))
    await flushPromises()
    cookie('student')
    window.dispatchEvent(new Event('focus'))
    await flushPromises()
    expect(wrapper.find('nav, aside, h1').exists()).toBe(false)
    expect(external).toHaveBeenCalledExactlyOnceWith('http://localhost:5173/')
  })
})
