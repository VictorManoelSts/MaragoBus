import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import App from '../src/App.vue'
import PortalLayout from '../src/layouts/PortalLayout.vue'
import router from '../src/router'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'

describe('Rotas existentes do Portal', () => {
  beforeEach(async () => {
    await setMockSession('student')
    await router.push('/')
    await router.isReady()
  })

  it('renderiza a página inicial pelo RouterView com o novo layout', async () => {
    const wrapper = mount(App, { global: { plugins: [router] } })
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('home')
    expect(wrapper.findComponent(PortalLayout).exists()).toBe(true)
    expect(wrapper.get('main h1').text()).toBe('Olá, Aluno!')
  })

  it('mantém o catálogo de desenvolvimento acessível e independente do PortalLayout', async () => {
    expect(import.meta.env.DEV).toBe(true)
    expect(router.hasRoute('design-system')).toBe(true)
    const wrapper = mount(App, { global: { plugins: [router] } })
    await router.push('/design-system')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('design-system')
    expect(wrapper.get('h1').text()).toBe('Design System')
    expect(wrapper.findComponent(PortalLayout).exists()).toBe(false)
    expect(wrapper.findAll('main')).toHaveLength(1)
    await router.push('/')
    await flushPromises()
    expect(wrapper.get('main h1').text()).toBe('Olá, Aluno!')
  })

  it('preserva o redirecionamento de caminhos desconhecidos para o início', async () => {
    const wrapper = mount(App, { global: { plugins: [router] } })
    await router.push('/pagina-inexistente')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/')
    expect(router.currentRoute.value.name).toBe('home')
    expect(wrapper.get('main h1').text()).toBe('Olá, Aluno!')
  })
})
