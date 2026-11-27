import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '../src/App.vue'
import AdminLayout from '../src/layouts/AdminLayout.vue'
import { createAdminRouter } from '../src/router'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'
import { authNavigation } from '@maragobus/shared/auth/navigation'

async function application(path: string) {
  await setMockSession('admin')
  const router = createAdminRouter(createMemoryHistory())
  await router.push(path)
  await router.isReady()
  const wrapper = mount(App, { attachTo: document.body, global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('Rotas existentes do Admin', () => {
  it('atualiza o título e leva o foco ao conteúdo após navegar pela sidebar', async () => {
    const { wrapper, router } = await application('/')
    expect(document.title).toBe('Painel administrativo | MaragoBus Admin')
    const link = wrapper.get<HTMLAnchorElement>('a[href="/suspensoes"]')
    const navigation = new Promise<void>(resolve => {
      const remove = router.afterEach(() => {
        remove()
        resolve()
      })
    })
    link.element.focus()
    await link.trigger('click')
    await navigation
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/suspensoes')
    expect(document.title).toBe('Suspensões | MaragoBus Admin')
    expect(wrapper.get('header h1').text()).toBe('Suspensões')
    expect(document.activeElement).toBe(wrapper.get('main').element)
  })

  it.each(['/datas-sem-transporte', '/suspensoes', '/avisos'])('protege %s para visitantes, alunos e motoristas', async path => {
    const external = vi.spyOn(authNavigation, 'openExternal').mockImplementation(() => {})
    document.cookie = 'maragobus_mock_session=; Path=/; Max-Age=0'
    const router = createAdminRouter(createMemoryHistory())
    try {
      await router.push(path)
      expect(external).toHaveBeenLastCalledWith('http://localhost:5173/login')
      await setMockSession('student')
      await router.push(path)
      expect(external).toHaveBeenLastCalledWith('http://localhost:5173/')
      await setMockSession('driver')
      await router.push(path)
      expect(external).toHaveBeenLastCalledWith('http://localhost:5173/motorista/reservas')
      expect(router.currentRoute.value.matched).toHaveLength(0)
    } finally {
      external.mockRestore()
    }
  })
  it('renderiza a página inicial pelo RouterView com o AdminLayout', async () => {
    const { wrapper, router } = await application('/')
    expect(router.currentRoute.value.name).toBe('home')
    expect(wrapper.findComponent(AdminLayout).exists()).toBe(true)
    expect(wrapper.get('header h1').text()).toBe('Painel administrativo')
  })

  it('preserva o catálogo em desenvolvimento e seu retorno à página inicial', async () => {
    const { wrapper, router } = await application('/design-system')
    expect(import.meta.env.DEV).toBe(true)
    expect(router.currentRoute.value.name).toBe('design-system')
    expect(document.title).toBe('Design System | MaragoBus Admin')
    expect(wrapper.get('h1').text()).toBe('Design System')
    expect(wrapper.findComponent(AdminLayout).exists()).toBe(false)
    expect(wrapper.findAll('main')).toHaveLength(1)
    await router.push('/')
    await flushPromises()
    expect(wrapper.get('header h1').text()).toBe('Painel administrativo')
  })

  it('mantém o fallback e registra somente os destinos previstos e o catálogo', async () => {
    const { wrapper, router } = await application('/rota-inexistente')
    expect(router.currentRoute.value.path).toBe('/')
    expect(wrapper.findComponent(AdminLayout).exists()).toBe(true)
    expect(router.getRoutes().filter(route => route.name).map(route => route.path).sort()).toEqual([
      '/', '/alunos', '/motoristas', '/faculdades', '/cursos', '/cursos-ofertados',
      '/advertencias', '/pontos-embarque', '/reservas', '/perfil', '/design-system', '/datas-sem-transporte', '/suspensoes', '/avisos',
    ].sort())
  })
})
