import { afterEach, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { getMockReservationForm } from '../src/mocks/reservation-form'
import { getDemonstrationNotices } from '../src/mocks/student-notifications'

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

it('desabilita autenticação no formulário em produção e ignora cookie mock', async () => {
  vi.stubEnv('DEV', false)
  vi.stubEnv('PROD', true)
  vi.resetModules()
  const { default: LoginPage } = await import('../src/pages/LoginPage.vue')
  const { authService } = await import('@maragobus/shared/auth/service')
  const { useSessionStore } = await import('@maragobus/shared/auth/session')
  const login = vi.spyOn(authService, 'login')
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/login', component: LoginPage }] })
  await router.push('/login')
  const pinia = createPinia()
  const session = useSessionStore(pinia)
  document.cookie = 'maragobus_mock_session=mock-admin-test; Path=/'
  await session.restore()
  expect(session.authenticated).toBe(false)
  const wrapper = mount(LoginPage, { global: { plugins: [pinia, router] } })
  expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
  expect(wrapper.text()).toContain('Autenticação indisponível neste ambiente.')
  await wrapper.get('#login-cpf').setValue('90000000175')
  await wrapper.get('#login-password').setValue('AlunoTeste!53')
  await wrapper.get('form').trigger('submit')
  expect(login).not.toHaveBeenCalled()
  expect(session.authenticated).toBe(false)
})

it('ignora o identificador de aluno simulado nos dados de exemplo em produção', () => {
  vi.stubEnv('DEV', false)
  vi.stubEnv('PROD', true)
  expect(getMockReservationForm('mock-student-test').college).toBeNull()
  expect(getDemonstrationNotices('mock-student-test')).toEqual([])
})
