import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { BaseCard } from '@maragobus/shared'
import App from '../src/App.vue'
import AdminSidebar from '../src/components/AdminSidebar.vue'
import AdminLayout from '../src/layouts/AdminLayout.vue'
import AdminShell from '../src/layouts/AdminShell.vue'
import { createAdminRouter } from '../src/router'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'

const destinations = [
  { path: '/', label: 'Visão geral', title: 'Painel administrativo' },
  { path: '/alunos', label: 'Alunos', title: 'Alunos' },
  { path: '/motoristas', label: 'Motoristas', title: 'Motoristas' },
  { path: '/faculdades', label: 'Faculdades', title: 'Faculdades' },
  { path: '/pontos-embarque', label: 'Pontos de embarque', title: 'Pontos de embarque' },
  { path: '/advertencias', label: 'Solicitações de advertência', title: 'Solicitações de advertência' },
  { path: '/perfil', label: 'Meu perfil', title: 'Meu perfil' },
  { path: '/cursos', label: 'Cursos', title: 'Cursos' },
  { path: '/cursos-ofertados', label: 'Cursos ofertados', title: 'Cursos ofertados' },
  { path: '/reservas', label: 'Reservas', title: 'Reservas' },
]

async function application(path = '/') {
  await setMockSession('admin')
  const router = createAdminRouter(createMemoryHistory())
  await router.push(path)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('Sidebar administrativa desktop', () => {
  it('renderiza os dez destinos em uma navegação semântica com ícones e rótulos', async () => {
    const { wrapper } = await application()
    const nav = wrapper.findComponent(AdminSidebar)
    expect(nav.element.tagName).toBe('NAV')
    expect(nav.attributes('aria-label')).toBe('Navegação administrativa')
    expect(nav.findAll('li')).toHaveLength(10)
    expect(nav.findAll('a').map(link => ({ path: link.attributes('href'), label: link.text() })))
      .toEqual(destinations.map(({ path, label }) => ({ path, label })))
    expect(nav.findAll('svg')).toHaveLength(10)
    const groups = nav.findAll('section')
    expect(groups.map(group => group.get('h3').text())).toEqual(['Principal', 'Gerenciamento complementar'])
    expect(groups.map(group => group.findAll('a').length)).toEqual([7, 3])
    for (const group of groups) {
      expect(group.attributes('aria-labelledby')).toBe(group.get('h3').attributes('id'))
    }
    for (const link of nav.findAll('a')) {
      expect(link.get('svg').attributes('aria-hidden')).toBe('true')
      expect(link.attributes('tabindex')).toBeUndefined()
      expect(link.classes()).toContain('admin-sidebar__link')
    }
  })

  it.each(destinations)('destaca somente $label em $path', async ({ path }) => {
    const { wrapper } = await application(path)
    const nav = wrapper.findComponent(AdminSidebar)
    expect(nav.findAll('a[aria-current="page"]')).toHaveLength(1)
    expect(nav.get('a[aria-current="page"]').attributes('href')).toBe(path)
    expect(nav.get('a[aria-current="page"]').classes()).toContain('router-link-exact-active')
    if (path !== '/') expect(nav.get('a[href="/"]').attributes('aria-current')).toBeUndefined()
  })

  it.each(destinations)('abre $path diretamente e renderiza apenas o conteúdo provisório', async ({ path, title }) => {
    const { wrapper } = await application(path)
    expect(wrapper.findComponent(AdminShell).exists()).toBe(true)
    expect(wrapper.findComponent(AdminLayout).exists()).toBe(true)
    expect(wrapper.findComponent(AdminSidebar).exists()).toBe(true)
    expect(wrapper.findAll('main')).toHaveLength(1)
    expect(wrapper.findAll('h1')).toHaveLength(1)
    expect(wrapper.get('main h1').text()).toBe(title)
    expect(wrapper.get('main p').text().length).toBeGreaterThan(20)
    expect(wrapper.findAllComponents(BaseCard)).toHaveLength(1)
    expect(wrapper.findComponent(BaseCard).text()).toBe(path === '/'
      ? 'As funcionalidades administrativas serão implementadas posteriormente.'
      : 'Esta funcionalidade administrativa será desenvolvida posteriormente.')
    expect(wrapper.get('main').findAll('table, form, input, canvas')).toHaveLength(0)
    expect(wrapper.get('main').findAll('button').map(button => button.text())).toEqual(path === '/perfil' ? ['Sair'] : [])
    expect(wrapper.get('header img').attributes('src')).toContain('logo-horizontal.svg')
  })

  it('navega pelos dez destinos usando RouterLink sem duplicar o layout', async () => {
    const { wrapper, router } = await application('/perfil')
    const sidebar = wrapper.findComponent(AdminSidebar)
    for (const { path, title } of destinations) {
      await sidebar.get('a[href="' + path + '"]').trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.path).toBe(path)
      expect(wrapper.get('main h1').text()).toBe(title)
      expect(wrapper.findAll('header')).toHaveLength(1)
      expect(wrapper.findAll('main')).toHaveLength(1)
    }
  })

  it('oculta a sidebar abaixo de lg e mantém o botão mobile associado ao drawer', async () => {
    const { wrapper } = await application('/pontos-embarque')
    const nav = wrapper.findComponent(AdminSidebar)
    expect([...nav.element.parentElement!.classList]).toEqual(expect.arrayContaining(['hidden', 'lg:block']))
    expect(wrapper.findAll('nav')).toHaveLength(1)
    expect(wrapper.get('button[aria-label="Abrir menu"]').classes()).toContain('lg:hidden')
    expect(wrapper.get('button[aria-label="Abrir menu"]').attributes('aria-expanded')).toBe('false')
  })

  it('permite rolagem independente no desktop, preservando o cabeçalho e a largura do main', async () => {
    const { wrapper } = await application()
    expect(wrapper.findComponent(AdminLayout).classes()).toEqual(expect.arrayContaining(['lg:h-svh', 'lg:overflow-hidden']))
    expect(wrapper.findComponent(AdminSidebar).classes()).toEqual(expect.arrayContaining(['w-64', 'h-full', 'overflow-y-auto']))
    expect(wrapper.get('header').classes()).toContain('shrink-0')
    expect(wrapper.get('main').classes()).toEqual(expect.arrayContaining(['min-w-0', 'flex-1', 'lg:overflow-y-auto']))
  })

  it('preserva o catálogo exclusivo de desenvolvimento fora do layout administrativo', async () => {
    const { wrapper, router } = await application('/alunos')
    expect(import.meta.env.DEV).toBe(true)
    await router.push('/design-system')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Design System')
    expect(wrapper.findComponent(AdminSidebar).exists()).toBe(false)
    expect(wrapper.findComponent(AdminLayout).exists()).toBe(false)
    await router.push('/')
    await flushPromises()
    expect(wrapper.get('main h1').text()).toBe('Painel administrativo')
    expect(wrapper.findComponent(AdminSidebar).get('a[aria-current="page"]').text()).toBe('Visão geral')
  })
})
