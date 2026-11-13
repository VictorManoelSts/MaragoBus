import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { BaseCard } from '@maragobus/shared'
import App from '../src/App.vue'
import StudentNavigation from '../src/components/StudentNavigation.vue'
import StudentLayout from '../src/layouts/StudentLayout.vue'
import PortalLayout from '../src/layouts/PortalLayout.vue'
import { createPortalRouter } from '../src/router'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'

const destinations = [
  { path: '/', label: 'Início', title: 'Olá, Aluno!' },
  { path: '/reservar', label: 'Fazer reserva', title: 'Fazer reserva' },
  { path: '/reservas', label: 'Minhas reservas', title: 'Minhas reservas' },
  { path: '/notificacoes', label: 'Notificações', title: 'Notificações' },
  { path: '/perfil', label: 'Meu perfil', title: 'Meu perfil' },
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
  it('renderiza exatamente os cinco destinos com rótulos, ícones e nav acessível', async () => {
    const { wrapper } = await navigation(variant)
    expect(wrapper.element.tagName).toBe('NAV')
    expect(wrapper.attributes('aria-label')).toBe('Navegação do aluno')
    expect(wrapper.findAll('li')).toHaveLength(5)
    expect(wrapper.findAll('a').map(link => ({ path: link.attributes('href'), label: link.text() })))
      .toEqual(destinations.map(({ path, label }) => ({ path, label })))
    expect(wrapper.findAll('svg')).toHaveLength(5)
    for (const link of wrapper.findAll('a')) {
      expect(link.get('svg').attributes('aria-hidden')).toBe('true')
      expect(link.attributes('tabindex')).toBeUndefined()
      expect(link.classes()).toContain('portal-navigation__link')
    }
  })

  it.each(destinations)('indica somente $label como página ativa em $path', async ({ path }) => {
    const { wrapper } = await navigation(variant, path)
    const current = wrapper.findAll('a[aria-current="page"]')
    expect(current).toHaveLength(1)
    expect(current[0]!.attributes('href')).toBe(path)
    expect(current[0]!.classes()).toContain('router-link-exact-active')
    if (path !== '/') expect(wrapper.get('a[href="/"]').attributes('aria-current')).toBeUndefined()
  })

  it('navega pelos cinco destinos via RouterLink sem recarregar a aplicação', async () => {
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
  it.each(destinations)('renderiza $path com o layout e título corretos', async ({ path, title }) => {
    const { wrapper } = await application(path)
    expect(wrapper.findComponent(StudentLayout).exists()).toBe(true)
    expect(wrapper.findComponent(PortalLayout).exists()).toBe(true)
    expect(wrapper.findAll('main')).toHaveLength(1)
    expect(wrapper.findAll('h1')).toHaveLength(1)
    expect(wrapper.get('main h1').text()).toBe(title)
    expect(wrapper.get('header img').attributes('src')).toContain('logo-horizontal.svg')
    expect(wrapper.findAllComponents(StudentNavigation)).toHaveLength(2)
    const card = wrapper.findComponent(BaseCard)
    if (path === '/reservar') expect(card.text()).toContain('Resumo da seleção')
    else expect(card.text()).toBe(path === '/' ? 'Sua reserva atualVocê não tem uma reserva atual para apresentar.Fazer reserva'
      : 'Esta funcionalidade será implementada posteriormente.')
    expect(wrapper.get('main p').text().length).toBeGreaterThan(20)
    expect(wrapper.get('main').findAll('input, select, form')).toHaveLength(path === '/reservar' ? 1 : 0)
    expect(wrapper.get('main').findAll('button').map(button => button.text())).toEqual(
      path === '/perfil' ? ['Sair'] : path === '/reservar' ? ['Confirmar reserva'] : [])
  })

  it('mantém Notificações exclusivamente para avisos administrativos enviados aos alunos', async () => {
    const { wrapper } = await application('/notificacoes')
    expect(wrapper.get('main p').text()).toBe(
      'Espaço exclusivo para avisos administrativos enviados aos alunos.',
    )
    expect(wrapper.findComponent(BaseCard).text()).toBe('Esta funcionalidade será implementada posteriormente.')
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
    expect(mobile!.get('ul').element.style.gridTemplateColumns).toMatch(/^repeat\(5, minmax\(0(?:px)?, 1fr\)\)$/)
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
    const { wrapper } = await application('/reservar')
    expect(wrapper.findComponent(BaseCard).text()).toContain('Resumo da seleção')
    expect(wrapper.get('main').findAll('select')).toHaveLength(1)
    expect(wrapper.get('main button').attributes('disabled')).toBeDefined()
    expect(wrapper.get('main').findAll('form, input, table, ul')).toHaveLength(0)
    expect(wrapper.findAll('h1')).toHaveLength(1)
  })

  it('descreve as finalidades futuras de Minhas reservas sem implementar histórico ou detalhes', async () => {
    const { wrapper } = await application('/reservas')
    expect(wrapper.get('main p').text()).toBe(
      'Consulte futuramente sua reserva atual, reservas anteriores, histórico de cancelamentos, detalhes e comprovantes disponíveis.',
    )
    expect(wrapper.get('main').findAll('table, form, input, select, button, ul')).toHaveLength(0)
  })

  it('preserva a descrição e o card do perfil, ajustando somente sua identificação', async () => {
    const { wrapper } = await application('/perfil')
    expect(wrapper.get('main h1').text()).toBe('Meu perfil')
    expect(wrapper.get('main p').text()).toBe('Espaço para consultar as informações do seu perfil de aluno.')
    expect(wrapper.findComponent(BaseCard).text()).toBe('Esta funcionalidade será implementada posteriormente.')
  })

  it('permite quebra dos novos rótulos no mobile sem truncá-los nem fixar sua largura', async () => {
    const { wrapper } = await navigation('mobile')
    for (const label of wrapper.findAll('a span')) expect(label.classes()).toContain('wrap-anywhere')
    for (const item of wrapper.findAll('li')) expect(item.classes()).toContain('min-w-0')
    expect(wrapper.text()).toContain('Minhas reservas')
    expect(wrapper.text()).toContain('Fazer reserva')
  })
})

describe('Compatibilidade das rotas do aluno', () => {
  const redirects = [
    { from: '/historico', to: '/reservas', title: 'Minhas reservas' },
    { from: '/avisos', to: '/notificacoes', title: 'Notificações' },
  ]

  it.each(redirects)('redireciona $from para $to, mantendo a página e os links ativos', async ({ from, to, title }) => {
    const { wrapper, router } = await application(from)
    expect(router.currentRoute.value.path).toBe(to)
    expect(wrapper.get('main h1').text()).toBe(title)
    for (const nav of wrapper.findAllComponents(StudentNavigation)) {
      expect(nav.findAll('a')).toHaveLength(5)
      expect(nav.get('a[aria-current="page"]').attributes('href')).toBe(to)
      expect(nav.find('a[href="' + from + '"]').exists()).toBe(false)
    }
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
      ['history', '/reservas'], ['announcements', '/notificacoes'],
    ]) {
      await router.push({ name })
      expect(router.currentRoute.value.path).toBe(path)
    }
  })
})
