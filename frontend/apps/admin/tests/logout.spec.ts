import { afterEach, expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '../src/App.vue'
import { createAdminRouter } from '../src/router'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { authNavigation } from '@maragobus/shared/auth/navigation'

afterEach(() => vi.restoreAllMocks())

it('encerra sessão restaurada no perfil Admin e retorna ao login único no Portal', async () => {
  document.cookie = 'maragobus_mock_session=mock-admin-test; Path=/'
  const pinia = createPinia()
  const session = useSessionStore(pinia)
  await session.restore()
  const external = vi.spyOn(authNavigation, 'openExternal').mockImplementation(() => {})
  const router = createAdminRouter(createMemoryHistory(), pinia)
  await router.push('/perfil')
  const wrapper = mount(App, { global: { plugins: [pinia, router] } })
  await flushPromises()
  expect(wrapper.text()).toContain('Administrador de Teste')
  await wrapper.findAll('button').find(button => button.text() === 'Sair')!.trigger('click')
  await flushPromises()
  expect(session.authenticated).toBe(false)
  expect(document.cookie).toBe('')
  expect(external).toHaveBeenCalledWith('http://localhost:5173/login')
})
