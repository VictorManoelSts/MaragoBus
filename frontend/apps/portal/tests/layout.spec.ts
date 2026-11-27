import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createMemoryHistory } from 'vue-router'
import { BaseCard, BrandLogo } from '@maragobus/shared'
import officialHorizontalLogo from '../../../packages/shared/src/assets/branding/logo-horizontal.svg?url'
import { startTheme } from '@maragobus/shared/theme'
import PortalLayout from '../src/layouts/PortalLayout.vue'
import HomePage from '../src/pages/HomePage.vue'
import App from '../src/App.vue'
import PortalNavigation from '../src/components/PortalNavigation.vue'
import PortalThemeSwitch from '../src/components/PortalThemeSwitch.vue'
import { createPortalRouter } from '../src/router'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'

describe('PortalLayout', () => {
  const storageKey = 'maragobus.theme'
  let stopTheme: () => void

  beforeEach(() => {
    localStorage.removeItem(storageKey)
    stopTheme = startTheme()
  })

  afterEach(() => {
    stopTheme()
    localStorage.removeItem(storageKey)
    delete document.documentElement.dataset.theme
  })

  it('usa a chave de tema aprovada no fallback e restaura a preferência', async () => {
    const wrapper = mount(PortalLayout)
    const toggle = wrapper.getComponent(PortalThemeSwitch)
    expect(wrapper.findAll('header button[role="switch"]')).toHaveLength(1)
    expect(wrapper.find('header select').exists()).toBe(false)
    expect(toggle.attributes('aria-label')).toBe('Tema escuro')
    expect(toggle.attributes('aria-checked')).toBe('false')
    await toggle.trigger('click')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(storageKey)).toBe('dark')
    wrapper.unmount()
    const reopened = mount(PortalLayout)
    expect(reopened.get('header button[role="switch"]').attributes('aria-checked')).toBe('true')
    expect(reopened.get('header img').classes()).toContain('mb-brand-logo--horizontal')
  })

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
    expect(logo.attributes('src')).toBe(officialHorizontalLogo)
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

describe('Tema do Portal do aluno', () => {
  it('oferece uma chave nativa com nome acessível e indicador nos dois estados', async () => {
    const key = 'maragobus.theme'
    localStorage.removeItem(key)
    const stop = startTheme()
    const wrapper = mount(PortalThemeSwitch, { attachTo: document.body })
    try {
      const toggle = wrapper.get<HTMLButtonElement>('button[role="switch"]')
      expect(wrapper.findAll('button')).toHaveLength(1)
      expect(toggle.attributes('aria-label')).toBe('Tema escuro')
      expect(toggle.attributes('type')).toBe('button')
      expect(toggle.attributes('tabindex')).toBeUndefined()
      expect(toggle.attributes('aria-checked')).toBe('false')
      expect(toggle.get('span').attributes('aria-hidden')).toBe('true')
      expect(toggle.findAll('svg')).toHaveLength(2)
      const indicator = toggle.get('.motion-reduce\\:transition-none')
      expect(indicator.classes()).not.toContain('translate-x-9')
      toggle.element.focus()
      expect(document.activeElement).toBe(toggle.element)

      await toggle.trigger('click')
      expect(toggle.attributes('aria-checked')).toBe('true')
      expect(indicator.classes()).toContain('translate-x-9')
      expect(localStorage.getItem(key)).toBe('dark')
      expect(document.activeElement).toBe(toggle.element)

      await toggle.trigger('click')
      expect(toggle.attributes('aria-checked')).toBe('false')
      expect(localStorage.getItem(key)).toBe('light')
    } finally {
      wrapper.unmount()
      stop()
      delete document.documentElement.dataset.theme
      localStorage.removeItem(key)
    }
  })

  it('mantém a preferência nas rotas e atualiza a chave ao sincronizar outra aba', async () => {
    await setMockSession('student')
    const key = 'maragobus.theme'
    localStorage.setItem(key, 'dark')
    const stop = startTheme()
    const router = createPortalRouter(createMemoryHistory())
    const wrapper = mount(App, { global: { plugins: [router] } })
    try {
      for (const path of ['/', '/comprovante', '/reservas', '/perfil']) {
        await router.push(path)
        await flushPromises()
        const scope = wrapper.get('.student-layout')
        const toggle = scope.get('header [role="switch"]')
        expect(toggle.attributes('aria-checked')).toBe('true')
        await scope.get('button[aria-haspopup="dialog"]').trigger('click')
        const panel = scope.get('section[role="dialog"]')
        expect(panel.classes()).toContain('bg-surface')
        expect(panel.get('.mb-feedback--info').text()).toBe('Não lida')

        for (const theme of ['light', 'dark']) {
          localStorage.setItem(key, theme)
          window.dispatchEvent(new StorageEvent('storage', { key, storageArea: localStorage }))
          await nextTick()
          expect(document.documentElement.dataset.theme).toBe(theme)
          expect(toggle.attributes('aria-checked')).toBe(String(theme === 'dark'))
          expect(panel.get('.mb-feedback--info').text()).toBe('Não lida')
        }
      }
    } finally {
      wrapper.unmount()
      stop()
      delete document.documentElement.dataset.theme
      localStorage.removeItem(key)
    }
  })
})

describe('Marca do Portal nos dois temas', () => {
  it.each([
    { role: 'student', path: '/comprovante' },
    { role: 'driver', path: '/motorista/reservas' },
  ] as const)('mantém o logotipo original nos dois temas no cabeçalho de $role', async ({ role, path }) => {
    localStorage.removeItem('maragobus.theme')
    const stop = startTheme()
    try {
      await setMockSession(role)
      const router = createPortalRouter(createMemoryHistory())
      await router.push(path)
      const wrapper = mount(App, { global: { plugins: [router] } })
      const header = wrapper.get('.portal-layout > header')
      const toggle = header.get('button[role="switch"]')

      for (const theme of ['light', 'dark', 'light']) {
        if (document.documentElement.dataset.theme !== theme) await toggle.trigger('click')
        expect(document.documentElement.dataset.theme).toBe(theme)
        const logo = header.get<HTMLImageElement>('img[alt="MaragoBus"]')
        expect(logo.classes()).toEqual(expect.arrayContaining(['mb-brand-logo--horizontal', 'w-44', 'sm:w-52']))
        expect(logo.attributes('src')).toBe(officialHorizontalLogo)
        expect(logo.attributes('style')).toBeUndefined()
        if (role === 'student') {
          expect(header.find('button[aria-haspopup="dialog"]').exists()).toBe(true)
          const receiptLogo = wrapper.get('main header img[alt="MaragoBus"]')
          expect(receiptLogo.attributes('src')).toBe(officialHorizontalLogo)
          expect(receiptLogo.classes()).toContain('w-36')
          expect(receiptLogo.attributes('style')).toBeUndefined()
        }
      }
      expect(header.classes()).not.toContain('border-t-2')
      expect(header.classes()).not.toContain('border-t-accent')
      expect(header.classes()).toEqual(expect.arrayContaining(['border-b', 'border-line']))
      wrapper.unmount()
    } finally {
      stop()
      localStorage.removeItem('maragobus.theme')
      delete document.documentElement.dataset.theme
    }
  })

  it.each(['light', 'dark'])('mantém o logotipo original do login no tema %s', async theme => {
    localStorage.setItem('maragobus.theme', theme)
    const stop = startTheme()
    try {
      const router = createPortalRouter(createMemoryHistory())
      await router.push('/login')
      const wrapper = mount(App, { global: { plugins: [router] } })
      expect(document.documentElement.dataset.theme).toBe(theme)
      const logo = wrapper.get('main header img[alt="MaragoBus"]')
      expect(logo.attributes('src')).toBe(officialHorizontalLogo)
      expect(logo.classes()).toEqual(expect.arrayContaining(['w-full', 'min-w-0']))
      expect(logo.element.parentElement?.classList.contains('grid-cols-2')).toBe(true)
      expect(logo.attributes('style')).toBeUndefined()
    } finally {
      stop()
      localStorage.removeItem('maragobus.theme')
      delete document.documentElement.dataset.theme
    }
  })

  it('preserva o fundo transparente do SVG horizontal e sua proporção original', () => {
    const svg = readFileSync('packages/shared/src/assets/branding/logo-horizontal.svg', 'utf8')
    const root = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement
    expect(root.tagName).toBe('svg')
    expect(root.getAttribute('viewBox')).toBe('0 0 4186 1024')
    expect(root.querySelectorAll('rect:not(defs rect), image, foreignObject, style')).toHaveLength(0)
    expect(root.getAttribute('style')).toBeNull()
  })

  it('não aplica caixas, filtros, máscaras ou opacidade reduzida às classes da marca', () => {
    for (const path of ['apps/portal/src/styles.css', 'packages/shared/src/styles/base.css']) {
      const css = readFileSync(path, 'utf8')
      for (const [, declarations] of css.matchAll(/[^{}]*\.(?:[\w-]*logo[\w-]*)[^{}]*\{([^{}]*)\}/gi)) {
        expect(declarations).not.toMatch(/(?:^|;)\s*(?:[\w-]*filter|[\w-]*mask[\w-]*|opacity)\s*:/i)
        expect(declarations).not.toMatch(/(?:^|;)\s*(?:background[\w-]*|padding[\w-]*|border[\w-]*)\s*:/i)
      }
    }
  })
})

describe('Largura do Portal nos dois perfis', () => {
  it.each([
    { path: '/reservas', count: 4 },
    { path: '/motorista/reservas', count: 3 },
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
    if (path === '/reservas') expect(wrapper.get('main p').classes()).toContain('max-w-prose')
    expect(wrapper.findAll('main')).toHaveLength(1)
  })
})

describe('Página inicial do Portal', () => {
  afterEach(() => vi.useRealTimers())

  it('integra a home do aluno ao layout e ao card compartilhado', async () => {
    await setMockSession('student')
    vi.setSystemTime(new Date('2026-11-16T13:59:00Z'))
    const router = createPortalRouter(createMemoryHistory())
    const wrapper = mount(PortalLayout, { slots: { default: HomePage }, global: { plugins: [router] } })
    expect(wrapper.findComponent(PortalLayout).exists()).toBe(true)
    expect(wrapper.get('main h1').text()).toBe('Olá, Aluno!')
    expect(wrapper.get('main').text()).toContain('Acompanhe e gerencie suas reservas de transporte.')
    expect(wrapper.findComponent(BaseCard).text()).toContain('Reservas abertas')
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
