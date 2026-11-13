import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '../src/App.vue'
import AdminLayout from '../src/layouts/AdminLayout.vue'
import { createAdminRouter } from '../src/router'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'

async function application(path: string) {
  await setMockSession('admin')
  const router = createAdminRouter(createMemoryHistory())
  await router.push(path)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('Rotas existentes do Admin', () => {
  it('renderiza a página inicial pelo RouterView com o AdminLayout', async () => {
    const { wrapper, router } = await application('/')
    expect(router.currentRoute.value.name).toBe('home')
    expect(wrapper.findComponent(AdminLayout).exists()).toBe(true)
    expect(wrapper.get('main h1').text()).toBe('Painel administrativo')
  })

  it('preserva o catálogo em desenvolvimento e seu retorno à página inicial', async () => {
    const { wrapper, router } = await application('/design-system')
    expect(import.meta.env.DEV).toBe(true)
    expect(router.currentRoute.value.name).toBe('design-system')
    expect(wrapper.get('h1').text()).toBe('Design System')
    expect(wrapper.findComponent(AdminLayout).exists()).toBe(false)
    expect(wrapper.findAll('main')).toHaveLength(1)
    await router.push('/')
    await flushPromises()
    expect(wrapper.get('main h1').text()).toBe('Painel administrativo')
  })

  it('mantém o fallback e registra somente os destinos previstos e o catálogo', async () => {
    const { wrapper, router } = await application('/rota-inexistente')
    expect(router.currentRoute.value.path).toBe('/')
    expect(wrapper.findComponent(AdminLayout).exists()).toBe(true)
    expect(router.getRoutes().filter(route => route.name).map(route => route.path).sort()).toEqual([
      '/', '/alunos', '/motoristas', '/faculdades', '/cursos', '/cursos-ofertados',
      '/advertencias', '/pontos-embarque', '/reservas', '/perfil', '/design-system',
    ].sort())
  })
})
