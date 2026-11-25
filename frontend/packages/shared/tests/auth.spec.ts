import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { authService } from '../src/auth/service'
import { mockAuthService } from '../src/auth/mock'
import { useSessionStore, startSessionSync } from '../src/auth/session'
import { authNavigation } from '../src/auth/navigation'

const credentials = [
  { cpf: '90000000175', password: 'AlunoTeste!53', role: 'student', id: 'mock-student-test' },
  { cpf: '90000000256', password: 'MotoristaTeste!53', role: 'driver', id: 'mock-driver-test' },
  { cpf: '90000000337', password: 'AdminTeste!53', role: 'admin', id: 'mock-admin-test' },
] as const

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  authService.logout()
})

describe('Serviço de autenticação exclusivamente fictício', () => {
  it.each(credentials)('autentica $role sem retornar CPF ou senha', async credential => {
    const user = await authService.login(credential)
    expect(user).toEqual({ id: credential.id, name: expect.stringContaining('Teste'), role: credential.role })
    expect(user).not.toHaveProperty('password')
    expect(user).not.toHaveProperty('cpf')
    expect(document.cookie).toBe('maragobus_mock_session=' + credential.id)
    expect(document.cookie).not.toContain(credential.password)
    expect(await authService.restore()).toEqual(user)
  })

  it.each([
    { cpf: '52998224725', password: 'AlunoTeste!53' },
    { cpf: '90000000175', password: 'incorreta' },
  ])('retorna o mesmo erro para credenciais incorretas', async credential => {
    await expect(authService.login(credential)).rejects.toThrow('CPF ou senha incorretos.')
    expect(document.cookie).toBe('')
  })

  it('normaliza pontuação do CPF', async () => {
    expect((await authService.login({ cpf: '900.000.001-75', password: 'AlunoTeste!53' })).role).toBe('student')
  })

  it('remove cookie desconhecido e não autentica sessão inválida', async () => {
    document.cookie = 'maragobus_mock_session=desconhecido; Path=/'
    expect(await authService.restore()).toBeNull()
    expect(document.cookie).toBe('')
  })

  it('usa cookie de host sem dados pessoais e com atributos locais apropriados', async () => {
    const setter = vi.spyOn(document, 'cookie', 'set')
    await authService.login(credentials[0])
    expect(setter).toHaveBeenCalledWith('maragobus_mock_session=mock-student-test; Path=/; SameSite=Lax')
    authService.logout()
    expect(setter).toHaveBeenLastCalledWith('maragobus_mock_session=; Path=/; SameSite=Lax; Max-Age=0')
  })

  it('recusa mock e cookie em produção, inclusive acesso direto à implementação', async () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('PROD', true)
    vi.resetModules()
    const production = await import('../src/auth/service')
    document.cookie = 'maragobus_mock_session=mock-admin-test; Path=/'
    expect(production.mockAuthAvailable).toBe(false)
    await expect(production.authService.login(credentials[2])).rejects.toThrow('Autenticação indisponível')
    expect(await production.authService.restore()).toBeNull()
    await expect(mockAuthService.login(credentials[0])).rejects.toThrow('Autenticação indisponível')
    expect(await mockAuthService.restore()).toBeNull()
  })
})

describe('Store Pinia e persistência local compartilhada', () => {
  it.each(credentials)('restaura $role em nova instância após recarregamento e limpa no logout', async credential => {
    const first = useSessionStore(createPinia())
    await first.login(credential)
    expect(first.authenticated).toBe(true)
    expect(first.$state).not.toHaveProperty('password')
    const reloaded = useSessionStore(createPinia())
    await reloaded.restore()
    expect(reloaded.user).toEqual(first.user)
    reloaded.logout()
    expect(reloaded.authenticated).toBe(false)
    const afterLogout = useSessionStore(createPinia())
    await afterLogout.restore()
    expect(afterLogout.user).toBeNull()
    await first.restore()
    expect(first.authenticated).toBe(false)
  })

  it('compartilha cookie por host entre stores independentes nas duas portas', async () => {
    const portal = useSessionStore(createPinia())
    const admin = useSessionStore(createPinia())
    const originalWindow = window
    vi.stubGlobal('window', { location: new URL('http://localhost:5173/') })
    await portal.login(credentials[2])
    vi.stubGlobal('window', { location: new URL('http://localhost:5174/') })
    await admin.restore()
    expect(admin.user).toEqual(portal.user)
    admin.logout()
    vi.stubGlobal('window', originalWindow)
    await portal.restore()
    expect(portal.authenticated).toBe(false)
  })

  it('sincroniza invalidação externa por timer e foco e oferece limpeza dos listeners', async () => {
    const pinia = createPinia()
    const session = useSessionStore(pinia)
    await session.login(credentials[0])
    vi.useFakeTimers()
    const stop = startSessionSync(pinia)
    await flushPromises()
    authService.logout()
    await vi.advanceTimersByTimeAsync(1000)
    expect(session.authenticated).toBe(false)
    document.cookie = 'maragobus_mock_session=mock-driver-test; Path=/'
    window.dispatchEvent(new Event('focus'))
    await flushPromises()
    expect(session.user?.role).toBe('driver')
    stop()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('não reativa sessão se logout ocorrer durante o login', async () => {
    const store = useSessionStore(createPinia())
    const request = store.login(credentials[0])
    store.logout()
    expect(await request).toBeNull()
    expect(store.authenticated).toBe(false)
    expect(await authService.restore()).toBeNull()
  })
})

describe('Navegação após login e logout', () => {
  it.each([['student', '/'], ['driver', '/motorista/reservas']] as const)('usa Vue Router para %s', async (role, path) => {
    const router = { replace: vi.fn().mockResolvedValue(undefined) }
    await authNavigation.afterLogin(role, router)
    expect(router.replace).toHaveBeenCalledWith(path)
  })
  it('navega para a origem do Admin sem parâmetros de credenciais', async () => {
    const external = vi.spyOn(authNavigation, 'openExternal').mockImplementation(() => {})
    const router = { replace: vi.fn() }
    await authNavigation.afterLogin('admin', router)
    expect(external).toHaveBeenCalledWith('http://localhost:5174/')
    expect(router.replace).not.toHaveBeenCalled()
  })
  it.each([5173, 5174])('retorna ao login único saindo pela porta %s', async port => {
    vi.stubGlobal('window', { location: new URL(`http://localhost:${port}/perfil`) })
    const external = vi.spyOn(authNavigation, 'openExternal').mockImplementation(() => {})
    const router = { replace: vi.fn().mockResolvedValue(undefined) }
    await authNavigation.afterLogout(router)
    if (port === 5173) expect(router.replace).toHaveBeenCalledWith('/login')
    else expect(external).toHaveBeenCalledWith('http://localhost:5173/login')
  })
})
