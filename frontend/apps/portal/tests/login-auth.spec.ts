import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import App from '../src/App.vue'
import { createPortalRouter } from '../src/router'
import { authService } from '@maragobus/shared/auth/service'
import { authNavigation } from '@maragobus/shared/auth/navigation'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { AuthError } from '@maragobus/shared/auth/contracts'
import type { SessionUser } from '@maragobus/shared/auth/contracts'
import { cpfError } from '../src/utils/cpf'

afterEach(() => {
  vi.restoreAllMocks()
  authService.logout()
})

async function application() {
  const pinia = createPinia()
  const router = createPortalRouter(createMemoryHistory(), pinia)
  await router.push('/login')
  const wrapper = mount(App, { attachTo: document.body, global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, router, session: useSessionStore(pinia) }
}

describe('Integração do login com autenticação de desenvolvimento', () => {
  it('não chama o serviço antes de validar os campos', async () => {
    const login = vi.spyOn(authService, 'login')
    const { wrapper } = await application()
    await wrapper.get('form').trigger('submit')
    expect(login).not.toHaveBeenCalled()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(2)
  })

  it('mostra carregamento e impede envios duplicados, inclusive antes do próximo tick', async () => {
    let resolve!: (user: SessionUser) => void
    const login = vi.spyOn(authService, 'login').mockImplementation(() => new Promise(done => { resolve = done }))
    const { wrapper, router } = await application()
    await wrapper.get('#login-cpf').setValue('90000000175')
    await wrapper.get('#login-password').setValue('AlunoTeste!53')
    const form = wrapper.get('form')
    const first = form.trigger('submit')
    const second = form.trigger('submit')
    await Promise.all([first, second])
    expect(login).toHaveBeenCalledTimes(1)
    expect(login).toHaveBeenCalledWith({ cpf: '90000000175', password: 'AlunoTeste!53' })
    expect(form.attributes('aria-busy')).toBe('true')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Carregando')
    await form.trigger('submit')
    expect(login).toHaveBeenCalledTimes(1)
    document.cookie = 'maragobus_mock_session=mock-student-test; Path=/'
    resolve({ id: 'mock-student-test', name: 'Aluno de Teste', role: 'student' })
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/'))
  })

  it('preserva os valores e foca a mensagem genérica de credenciais incorretas', async () => {
    vi.spyOn(authService, 'login').mockRejectedValue(new AuthError())
    const { wrapper, session, router } = await application()
    await wrapper.get('#login-cpf').setValue('90000000175')
    await wrapper.get('#login-password').setValue('senha incorreta')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toBe('CPF ou senha incorretos.')
    expect(document.activeElement).toBe(alert.element)
    expect((wrapper.get('#login-cpf').element as HTMLInputElement).value).toBe('900.000.001-75')
    expect((wrapper.get('#login-password').element as HTMLInputElement).value).toBe('senha incorreta')
    expect(wrapper.get('form').attributes('aria-busy')).toBe('false')
    expect(session.authenticated).toBe(false)
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it.each([
    { cpf: '90000000175', password: 'AlunoTeste!53', role: 'student', destination: '/' },
    { cpf: '90000000256', password: 'MotoristaTeste!53', role: 'driver', destination: '/motorista/reservas' },
    { cpf: '90000000337', password: 'AdminTeste!53', role: 'admin', destination: 'http://localhost:5174/' },
  ])('autentica $role com CPF gerado para teste e navega ao destino correto', async credential => {
    expect(cpfError(credential.cpf)).toBe('')
    const external = vi.spyOn(authNavigation, 'openExternal').mockImplementation(() => {})
    const { wrapper, session, router } = await application()
    await wrapper.get('#login-cpf').setValue(credential.cpf)
    await wrapper.get('#login-password').setValue(credential.password)
    await wrapper.get('form').trigger('submit')
    await new Promise(resolve => setTimeout(resolve, 300))
    await flushPromises()
    expect(session.authenticated).toBe(true)
    expect(session.user?.role).toBe(credential.role)
    expect(JSON.stringify(session.$state)).not.toContain(credential.password)
    if (credential.role === 'admin') {
      expect(external).toHaveBeenCalledWith(credential.destination)
      expect((wrapper.get('#login-password').element as HTMLInputElement).value).toBe('')
    } else {
      expect(router.currentRoute.value.path).toBe(credential.destination)
      await router.push(credential.role === 'driver' ? '/motorista/perfil' : '/perfil')
      await flushPromises()
      expect(session.authenticated).toBe(true)
      const logout = wrapper.findAll('button').find(button => button.text() === 'Sair')!
      expect(logout.exists()).toBe(true)
      await logout.trigger('click')
      await flushPromises()
      expect(session.user).toBeNull()
      expect(document.cookie).toBe('')
      // jsdom utiliza outra origem padrão; a função de navegação é testada separadamente.
      expect(external).toHaveBeenCalledWith('http://localhost:5173/login')
    }
  })
})
