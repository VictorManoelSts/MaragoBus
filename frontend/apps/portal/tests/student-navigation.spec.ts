import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { BaseCard } from '@maragobus/shared'
import { authNavigation } from '@maragobus/shared/auth/navigation'
import { startTheme } from '@maragobus/shared/theme'
import { useSessionStore } from '@maragobus/shared/auth/session'
import App from '../src/App.vue'
import StudentNavigation from '../src/components/StudentNavigation.vue'
import StudentLayout from '../src/layouts/StudentLayout.vue'
import PortalLayout from '../src/layouts/PortalLayout.vue'
import { createPortalRouter } from '../src/router'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'

const destinations = [
  { path: '/', desktop: 'Início', mobile: 'Início', title: 'Olá, Aluno!' },
  { path: '/comprovante', desktop: 'Comprovante', mobile: 'Comprovante', title: 'Comprovante' },
  { path: '/reservas', desktop: 'Minhas reservas', mobile: 'Reservas', title: 'Minhas reservas' },
  { path: '/perfil', desktop: 'Meu perfil', mobile: 'Perfil', title: 'Meu perfil' },
]
const variants = ['desktop', 'mobile'] as const

async function navigation(variant: 'desktop' | 'mobile', path = '/') {
  await setMockSession('student')
  const router = createPortalRouter(createMemoryHistory())
  await router.push(path)
  await router.isReady()
  const wrapper = mount(StudentNavigation, { props: { variant }, global: { plugins: [router] } })
  return { wrapper, router }
}

async function application(path = '/') {
  await setMockSession('student')
  const router = createPortalRouter(createMemoryHistory())
  await router.push(path)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe.each(variants)('Navegação do aluno: %s', variant => {
  it('renderiza exatamente os quatro destinos com rótulos, ícones e nav acessível', async () => {
    const { wrapper } = await navigation(variant)
    expect(wrapper.element.tagName).toBe('NAV')
    expect(wrapper.attributes('aria-label')).toBe('Navegação do aluno')
    expect(wrapper.findAll('li')).toHaveLength(4)
    expect(wrapper.findAll('a').map(link => ({ path: link.attributes('href'), label: link.text() })))
      .toEqual(destinations.map(item => ({ path: item.path, label: item[variant] })))
    expect(wrapper.findAll('svg')).toHaveLength(4)
    expect(wrapper.get('a[href="/comprovante"] svg').classes()).toContain('lucide-ticket')
    for (const link of wrapper.findAll('a')) {
      expect(link.get('svg').attributes('aria-hidden')).toBe('true')
      expect(link.attributes('tabindex')).toBeUndefined()
      expect(link.classes()).toContain('portal-navigation__link')
    }
  })

  it.each(destinations)('indica somente $path como página ativa em $path', async ({ path }) => {
    const { wrapper } = await navigation(variant, path)
    const current = wrapper.findAll('a[aria-current="page"]')
    expect(current).toHaveLength(1)
    expect(current[0]!.attributes('href')).toBe(path)
    expect(current[0]!.classes()).toContain('router-link-exact-active')
    if (path !== '/') expect(wrapper.get('a[href="/"]').attributes('aria-current')).toBeUndefined()
  })

  it('navega pelos quatro destinos via RouterLink sem recarregar a aplicação', async () => {
    const { wrapper, router } = await navigation(variant)
    for (const { path } of [...destinations.slice(1), destinations[0]!]) {
      await wrapper.get('a[href="' + path + '"]').trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.path).toBe(path)
      expect(wrapper.get('a[aria-current="page"]').attributes('href')).toBe(path)
    }
  })
})

describe('Integração das páginas do aluno', () => {
  afterEach(() => vi.useRealTimers())

  it('remove a largura mínima do body somente no layout do aluno', async () => {
    const { wrapper } = await application()
    const styles = readFileSync(resolvePath('apps/portal/src/styles.css'), 'utf8')
    expect(wrapper.findComponent(PortalLayout).classes()).toContain('student-layout')
    expect(styles).toContain('html:has(.student-layout) body { min-width: 0; }')
  })

  it.each(destinations)('renderiza $path com o layout e título corretos', async ({ path, title }) => {
    vi.setSystemTime(new Date('2026-11-16T14:00:00Z'))
    const { wrapper } = await application(path)
    expect(wrapper.findComponent(StudentLayout).exists()).toBe(true)
    expect(wrapper.findComponent(PortalLayout).exists()).toBe(true)
    expect(wrapper.findComponent(PortalLayout).classes()).toContain('student-layout')
    expect(wrapper.findAll('main')).toHaveLength(1)
    expect(wrapper.findAll('h1')).toHaveLength(1)
    expect(wrapper.get('main h1').text()).toBe(title)
    expect(wrapper.get('header img').attributes('src')).toContain('logo-horizontal.svg')
    expect(wrapper.findAllComponents(StudentNavigation)).toHaveLength(2)
    const card = wrapper.findComponent(BaseCard)
    if (path === '/reservas') expect(card.text()).toContain('Você ainda não tem reservas.')
    else if (path === '/perfil') expect(card.text()).toContain('Dados pessoais')
    else if (path === '/comprovante') expect(wrapper.get('main p').text()).toContain('Você não tem reservas para hoje')
    else expect(wrapper.get('main').text()).toContain('Reservas fechadas')
    expect(wrapper.get('main p').text().length).toBeGreaterThan(20)
    expect(wrapper.get('main').findAll('input, select, form')).toHaveLength(path === '/perfil' ? 4 : path === '/reservas' ? 3 : 0)
    const buttons = wrapper.get('main').findAll('button').map(button => button.text())
    expect(buttons).toEqual(path === '/perfil' ? ['Salvar alterações', 'Descartar alterações', 'Sair'] : [])
    expect(wrapper.findAll('header button').filter(button => button.text() === 'Sair')).toHaveLength(0)
  })

  it('abre os avisos pelo sino e mantém a página atual ativa', async () => {
    const { wrapper, router } = await application('/reservas')
    const bell = wrapper.get('header button[aria-label="Notificações"]')
    expect(bell.attributes('aria-current')).toBeUndefined()
    await bell.trigger('click')
    await flushPromises()
    const panel = document.querySelector('dialog[open], [role="dialog"]')
      ?? wrapper.find('dialog[open], [role="dialog"]').element
    expect(panel?.textContent).toContain('Notificações')
    expect(panel?.textContent).toContain('Exemplo de comunicado sobre o calendário')
    expect(router.currentRoute.value.path).toBe('/reservas')
    expect(document.title).toBe('Minhas reservas — MaragoBus')
    expect(wrapper.get('main h1').text()).toBe('Minhas reservas')
    for (const nav of wrapper.findAllComponents(StudentNavigation)) {
      expect(nav.get('a[aria-current="page"]').attributes('href')).toBe('/reservas')
    }
  })

  it('alterna desktop e mobile pelo mesmo breakpoint, sem fixar a barra fora do fluxo', async () => {
    const { wrapper } = await application()
    const [desktop, mobile] = wrapper.findAllComponents(StudentNavigation)
    expect(desktop!.props('variant')).toBe('desktop')
    expect(desktop!.element.parentElement!.classList.contains('hidden')).toBe(true)
    expect(desktop!.element.parentElement!.classList.contains('lg:block')).toBe(true)
    expect(mobile!.props('variant')).toBe('mobile')
    const mobileRegion = mobile!.element.parentElement!
    expect([...mobileRegion.classList]).toEqual(expect.arrayContaining(['sticky', 'bottom-0', 'lg:hidden']))
    expect(mobileRegion.classList.contains('fixed')).toBe(false)
    expect(mobileRegion.classList.contains('absolute')).toBe(false)
    expect(mobile!.get('ul').classes()).toContain('grid')
    expect(mobile!.get('ul').element.style.gridTemplateColumns).toMatch(/^repeat\(4, minmax\(0(?:px)?, 1fr\)\)$/)
    expect(mobile!.classes()).toContain('portal-navigation--mobile')
    expect(mobile!.get('a').classes()).toEqual(expect.arrayContaining(['min-h-16', 'text-xs', 'sm:text-helper']))
    expect(wrapper.get('main').classes()).toContain('min-w-0')
    expect(wrapper.get('main').element.nextElementSibling).toBeNull()
    // A região da barra é irmã posterior do contêiner do main, ocupando espaço no fluxo.
    expect(wrapper.get('main').element.parentElement!.nextElementSibling).toBe(mobileRegion)
  })

  it('retira a navegação do aluno ao acessar o catálogo e a restaura ao voltar', async () => {
    const { wrapper, router } = await application('/reservas')
    expect(import.meta.env.DEV).toBe(true)
    await router.push('/design-system')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Design System')
    expect(wrapper.findComponent(StudentLayout).exists()).toBe(false)
    expect(wrapper.findComponent(StudentNavigation).exists()).toBe(false)
    expect(wrapper.findAll('main')).toHaveLength(1)
    await router.push('/perfil')
    await flushPromises()
    expect(wrapper.get('main h1').text()).toBe('Meu perfil')
    expect(wrapper.findAllComponents(StudentNavigation)).toHaveLength(2)
  })

  it('apresenta seleção demonstrativa em Fazer reserva sem criar registros', async () => {
    vi.setSystemTime(new Date('2026-11-16T13:59:00Z'))
    const { wrapper } = await application('/')
    expect(wrapper.findComponent(BaseCard).text()).toContain('Reservas abertas')
    expect(wrapper.get('main').findAll('select')).toHaveLength(1)
    expect(wrapper.get('main button').attributes('disabled')).toBeDefined()
    expect(wrapper.get('main').findAll('form')).toHaveLength(1)
    expect(wrapper.findAll('h1')).toHaveLength(1)
  })

  it('oferece acesso a Fazer reserva no estado vazio de Minhas reservas', async () => {
    const { wrapper } = await application('/reservas')
    expect(wrapper.get('main p').text()).toContain('reservas de demonstração')
    expect(wrapper.get('main a').attributes('href')).toBe('/')
  })

  it('encerra a sessão pelo perfil após as seções e fora do formulário', async () => {
    const { wrapper } = await application('/perfil')
    expect(wrapper.get('main h1').text()).toBe('Meu perfil')
    const point = wrapper.get('main select')
    expect(wrapper.get('label[for="' + point.attributes('id') + '"]').text()).toBe('Ponto de embarque padrão')
    expect(wrapper.findComponent(BaseCard).text()).toContain('Aluno de Teste')
    expect(wrapper.get('main').text()).not.toContain('Sessão de teste')
    const logout = wrapper.findAll('button').filter(button => button.text() === 'Sair')
    expect(logout).toHaveLength(1)
    expect(logout[0]?.element.closest('main')).toBe(wrapper.get('main').element)
    expect(logout[0]?.element.closest('form')).toBeNull()
    expect(logout[0]?.element.parentElement?.previousElementSibling?.textContent).toContain('Segurança')
    const redirect = vi.spyOn(authNavigation, 'openExternal').mockImplementation(() => {})
    const key = 'maragobus.theme'
    localStorage.removeItem(key)
    const stop = startTheme()
    try {
      await wrapper.get('header [role="switch"]').trigger('click')
      await logout[0]?.trigger('click')
      expect(useSessionStore().authenticated).toBe(false)
      expect(redirect).toHaveBeenCalledWith('http://localhost:5173/login')
      expect(localStorage.getItem(key)).toBe('dark')
      expect(document.documentElement.dataset.theme).toBe('dark')
    } finally {
      stop()
      delete document.documentElement.dataset.theme
      localStorage.removeItem(key)
      redirect.mockRestore()
    }
  })

  it('distribui os quatro rótulos mobile sem forçar largura além das colunas', async () => {
    const { wrapper } = await navigation('mobile')
    expect(wrapper.get('ul').element.style.gridTemplateColumns).toMatch(/^repeat\(4, minmax\(0(?:px)?, 1fr\)\)$/)
    for (const link of wrapper.findAll('a')) {
      expect(link.classes()).toContain('min-w-0')
      expect(link.get('span').classes()).toEqual(expect.arrayContaining(['min-w-0', 'max-w-full', 'wrap-anywhere']))
      expect(link.get('span').classes()).not.toContain('whitespace-nowrap')
    }
    for (const item of wrapper.findAll('li')) expect(item.classes()).toContain('min-w-0')

  })
})

describe('Compatibilidade das rotas do aluno', () => {
  const redirects = [
    { from: '/reservar', to: '/', title: 'Olá, Aluno!' },
    { from: '/historico', to: '/reservas', title: 'Minhas reservas' },
    { from: '/avisos', to: '/', title: 'Olá, Aluno!' },
    { from: '/notificacoes', to: '/', title: 'Olá, Aluno!' },
  ]

  it.each(redirects)('redireciona $from para $to, mantendo a página e os links ativos', async ({ from, to, title }) => {
    const { wrapper, router } = await application(from)
    expect(router.currentRoute.value.path).toBe(to)
    expect(wrapper.get('main h1').text()).toBe(title)
    for (const nav of wrapper.findAllComponents(StudentNavigation)) {
      expect(nav.findAll('a')).toHaveLength(4)
      const active = nav.find('a[aria-current="page"]')
      expect(active.attributes('href')).toBe(to)
      expect(nav.find('a[href="' + from + '"]').exists()).toBe(false)
    }
    const bell = wrapper.get('header button[aria-label="Notificações"]')
    expect(bell.attributes('aria-current')).toBeUndefined()
  })

  it.each(redirects)('preserva query e hash ao redirecionar $from', async ({ from, to }) => {
    const { router } = await application(from + '?origem=link-antigo#conteudo')
    expect(router.currentRoute.value.path).toBe(to)
    expect(router.currentRoute.value.query).toEqual({ origem: 'link-antigo' })
    expect(router.currentRoute.value.hash).toBe('#conteudo')
  })

  it('preserva os links internos que usam os nomes anteriores das rotas', async () => {
    const { router } = await application()
    for (const [name, path] of [
      ['home', '/'], ['reservations', '/reservas'], ['profile', '/perfil'],
      ['history', '/reservas'],
      ['receipt', '/comprovante'], ['new-reservation', '/'],
    ]) {
      await router.push({ name })
      expect(router.currentRoute.value.path).toBe(path)
    }
  })
})
