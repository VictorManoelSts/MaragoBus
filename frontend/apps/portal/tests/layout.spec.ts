import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { BaseCard, BrandLogo } from '@maragobus/shared'
import PortalLayout from '../src/layouts/PortalLayout.vue'
import HomePage from '../src/pages/HomePage.vue'
import App from '../src/App.vue'
import PortalNavigation from '../src/components/PortalNavigation.vue'
import { createPortalRouter } from '../src/router'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'

describe('PortalLayout', () => {
  it('renderiza cabeçalho e uma única área principal semântica', () => {
    const wrapper = mount(PortalLayout)
    expect(wrapper.findAll('header')).toHaveLength(1)
    expect(wrapper.findAll('main')).toHaveLength(1)
    expect(wrapper.get('header').find('main').exists()).toBe(false)
  })

  it('usa o BrandLogo compartilhado com o SVG horizontal oficial', () => {
    const wrapper = mount(PortalLayout)
    expect(wrapper.findComponent(BrandLogo).exists()).toBe(true)
    const logo = wrapper.get('header img')
    expect(logo.attributes('src')).toContain('logo-horizontal.svg')
    expect(logo.attributes('alt')).toBe('MaragoBus')
    expect(wrapper.findAll('img')).toHaveLength(1)
  })

  it('renderiza o slot da página dentro do main', () => {
    const wrapper = mount(PortalLayout, {
      slots: { default: '<section><h1>Página de exemplo</h1><p>Conteúdo principal</p></section>' },
    })
    expect(wrapper.get('main h1').text()).toBe('Página de exemplo')
    expect(wrapper.get('main p').text()).toBe('Conteúdo principal')
  })

  it('não reserva regiões de navegação quando os slots estão ausentes', () => {
    const wrapper = mount(PortalLayout)
    expect(wrapper.find('nav').exists()).toBe(false)
    expect(wrapper.find('aside').exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.findAll('div').some(region => region.classes().includes('shrink-0'))).toBe(false)
    expect(wrapper.findAll('div').some(region => region.classes().includes('lg:hidden'))).toBe(false)
  })

  it('oferece pontos opcionais separados para a futura navegação', () => {
    const wrapper = mount(PortalLayout, {
      slots: {
        'desktop-navigation': '<p>Conteúdo desktop de teste</p>',
        'mobile-navigation': '<p>Conteúdo mobile de teste</p>',
      },
    })
    const desktop = wrapper.findAll('div').find(region => region.classes().includes('shrink-0'))!
    expect(desktop.classes()).toEqual(expect.arrayContaining(['hidden', 'lg:block']))
    expect(desktop.text()).toBe('Conteúdo desktop de teste')
    const mobile = wrapper.findAll('div').find(region => region.classes().includes('lg:hidden'))!
    expect(mobile.text()).toBe('Conteúdo mobile de teste')
  })

  it('aplica tokens e estrutura responsiva sem largura mínima fixa no conteúdo', () => {
    const wrapper = mount(PortalLayout)
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['bg-app', 'text-content', 'min-w-0']))
    expect(wrapper.get('header').classes()).toEqual(expect.arrayContaining(['bg-surface', 'border-line']))
    expect(wrapper.get('main').classes()).toEqual(expect.arrayContaining([
      'min-w-0', 'wrap-anywhere', 'px-4', 'sm:px-6', 'lg:px-8', 'py-8', 'sm:py-10', 'lg:py-12',
    ]))
    expect(wrapper.get('header > div').classes()).toContain('w-full')
    expect(wrapper.get('header img').classes()).toEqual(expect.arrayContaining(['w-44', 'sm:w-52']))
  })

  it('mantém os contêineres externos fluidos, sem centralização ou largura máxima', () => {
    const wrapper = mount(PortalLayout)
    const headerContent = wrapper.get('header > div')
    const body = wrapper.get('main').element.parentElement!
    for (const classes of [wrapper.classes(), headerContent.classes(), [...body.classList]]) {
      expect(classes).toContain('w-full')
      expect(classes).not.toContain('mx-auto')
      expect(classes).not.toContain('container')
      expect(classes.some(name => name.startsWith('max-w-'))).toBe(false)
    }
    expect(wrapper.get('main').classes()).toEqual(expect.arrayContaining(['flex-1', 'min-w-0']))
  })

  it('acomoda conteúdo extenso no fluxo da página, sem altura fixa no main', () => {
    const text = 'conteudo-extenso'.repeat(100)
    const wrapper = mount(PortalLayout, { slots: { default: '<p>' + text + '</p>' } })
    expect(wrapper.classes()).toContain('min-h-svh')
    expect(wrapper.get('main').classes()).toContain('flex-1')
    expect(wrapper.get('main p').text()).toBe(text)
    expect(wrapper.get('main').attributes('style')).toBeUndefined()
  })

  it('oferece salto por teclado para uma área principal focalizável', () => {
    const wrapper = mount(PortalLayout)
    const skip = wrapper.get('a')
    const main = wrapper.get('main')
    expect(skip.attributes('href')).toBe('#' + main.attributes('id'))
    expect(skip.text()).toBe('Ir para o conteúdo principal')
    expect(skip.classes()).toContain('focus:not-sr-only')
    expect(main.attributes('tabindex')).toBe('-1')
  })
})

describe('Largura do Portal nos dois perfis', () => {
  it.each([
    { path: '/reservas', count: 5 },
    { path: '/motorista/reservas', count: 4 },
  ])('preserva sidebar e barra mobile em estrutura fluida para $path', async ({ path, count }) => {
    await setMockSession(path.startsWith('/motorista') ? 'driver' : 'student')
    const router = createPortalRouter(createMemoryHistory())
    await router.push(path)
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router] } })
    await flushPromises()
    const layout = wrapper.findComponent(PortalLayout)
    const navs = wrapper.findAllComponents(PortalNavigation)
    const desktop = navs.find(nav => nav.props('variant') === 'desktop')!
    const mobile = navs.find(nav => nav.props('variant') === 'mobile')!
    const main = wrapper.get('main').element
    const body = main.parentElement!
    const sidebarRegion = desktop.element.parentElement!

    expect(layout.classes()).toContain('w-full')
    expect([...body.classList]).toEqual(expect.arrayContaining(['w-full', 'flex', 'min-w-0']))
    expect(body.classList.contains('mx-auto')).toBe(false)
    expect([...body.classList].some(name => name.startsWith('max-w-'))).toBe(false)
    expect(body.firstElementChild).toBe(sidebarRegion)
    expect(sidebarRegion.nextElementSibling).toBe(main)
    expect([...sidebarRegion.classList]).toEqual(expect.arrayContaining(['hidden', 'shrink-0', 'lg:block']))
    expect(desktop.classes()).toContain('w-64')
    expect(mobile.classes()).not.toContain('w-64')
    expect([...mobile.element.parentElement!.classList]).toEqual(expect.arrayContaining(['sticky', 'bottom-0', 'lg:hidden']))
    expect(body.nextElementSibling).toBe(mobile.element.parentElement)

    for (const nav of navs) {
      expect(nav.findAll('a')).toHaveLength(count)
      expect(nav.get('a[aria-current="page"]').attributes('href')).toBe(path)
    }
    expect(wrapper.get('main p').classes()).toContain('max-w-prose')
    expect(wrapper.findAll('main')).toHaveLength(1)
  })
})

describe('Página inicial do Portal', () => {
  it('integra a home do aluno ao layout e ao card compartilhado', async () => {
    await setMockSession('student')
    const router = createPortalRouter(createMemoryHistory())
    const wrapper = mount(PortalLayout, { slots: { default: HomePage }, global: { plugins: [router] } })
    expect(wrapper.findComponent(PortalLayout).exists()).toBe(true)
    expect(wrapper.get('main h1').text()).toBe('Olá, Aluno!')
    expect(wrapper.get('main').text()).toContain('Acompanhe suas reservas de transporte universitário.')
    expect(wrapper.findComponent(BaseCard).text()).toContain('Você não tem uma reserva atual para apresentar.')
    expect(wrapper.findAll('main')).toHaveLength(1)
    expect(wrapper.findAll('img')).toHaveLength(1)
  })

  it('limita a largura da descrição e utiliza a hierarquia tipográfica existente', () => {
    const router = createPortalRouter(createMemoryHistory())
    const wrapper = mount(PortalLayout, { slots: { default: HomePage }, global: { plugins: [router] } })
    expect(wrapper.get('h1').classes()).toContain('text-page')
    expect(wrapper.get('p').classes()).toEqual(expect.arrayContaining(['max-w-prose', 'text-body', 'text-muted']))
  })
})
