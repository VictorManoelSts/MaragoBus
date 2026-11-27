import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { BaseBadge, BaseCard } from '@maragobus/shared'
import { applyDriverDemoPreference, clearDriverDemoSession, setDriverDemoSession } from '@maragobus/shared/auth/driver-demo'
import { authNavigation } from '@maragobus/shared/auth/navigation'
import { useSessionStore } from '@maragobus/shared/auth/session'
import App from '../src/App.vue'
import DriverLayout from '../src/layouts/DriverLayout.vue'
import StudentNavigation from '../src/components/StudentNavigation.vue'
import PortalNavigation from '../src/components/PortalNavigation.vue'
import { createPortalRouter } from '../src/router'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'

const destinations = [
  { path: '/motorista/reservas', label: 'Reservas', title: 'Reservas' },
  { path: '/motorista/advertencias', label: 'Advertências', title: 'Solicitações de advertência' },
  { path: '/motorista/perfil', label: 'Meu perfil', title: 'Perfil do motorista' },
]

async function application(path: string) {
  await setMockSession('driver')
  const router = createPortalRouter(createMemoryHistory())
  await router.push(path)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('Navegação do motorista', () => {
  it('abre o perfil com a identidade da sessão e campos somente para leitura', async () => {
    const { wrapper } = await application('/motorista/perfil')
    expect(wrapper.findComponent(DriverLayout).exists()).toBe(true)
    expect(wrapper.findComponent(StudentNavigation).exists()).toBe(false)
    expect(wrapper.get('main h1').text()).toBe('Perfil do motorista')
    const card = wrapper.getComponent(BaseCard)
    expect(card.get('h2').text()).toBe('Motorista de Teste')
    expect(card.get('svg').attributes('aria-hidden')).toBe('true')
    expect(card.getComponent(BaseBadge).text()).toBe('Motorista')
    expect(card.get('h3').text()).toBe('Dados pessoais')
    expect(card.get('dt').text()).toBe('Nome completo')
    expect(card.get('dd').text()).toBe('Motorista de Teste')
    expect(card.text()).toContain('Solicite alterações cadastrais à administração.')
    expect(card.findAll('input, form, select, textarea, button')).toHaveLength(0)
    expect(wrapper.get('main').findAll('button').map(button => button.text())).toEqual(['Sair'])
  })

  it('indica os dados indisponíveis na sessão', async () => {
    const { wrapper } = await application('/motorista/perfil')
    const rows = wrapper.get('main dl').findAll('div').slice(1)
    expect(rows.map(row => [row.get('dt').text(), row.get('dd').text()])).toEqual([
      ['CPF', 'Não informado'],
      ['E-mail', 'Não informado'],
      ['Telefone', 'Não informado'],
    ])
  })

  it.each(['anonymous', 'student', 'admin'] as const)('protege o perfil da sessão %s', async role => {
    const external = vi.spyOn(authNavigation, 'openExternal').mockImplementation(() => {})
    try {
      if (role !== 'anonymous') await setMockSession(role)
      const router = createPortalRouter(createMemoryHistory())
      await router.push('/motorista/perfil')
      expect(router.currentRoute.value.path).toBe(role === 'anonymous' ? '/login' : '/')
      expect(router.currentRoute.value.name).not.toBe('driver-profile')
      if (role === 'admin') expect(external).toHaveBeenCalledWith('http://localhost:5174/')
    } finally {
      external.mockRestore()
    }
  })

  it('substitui a identidade ao trocar de motorista e oculta o perfil ao trocar de papel', async () => {
    const { wrapper } = await application('/motorista/perfil')
    const session = useSessionStore()
    expect(wrapper.get('main h2').text()).toBe('Motorista de Teste')

    applyDriverDemoPreference('/demo-motorista')
    setDriverDemoSession('driver-demo-2')
    try {
      await session.restore()
      await flushPromises()
      expect(wrapper.get('main h2').text()).toBe('Motorista Demo 2')
      expect(wrapper.get('main dd').text()).toBe('Motorista Demo 2')
      expect(wrapper.text()).not.toContain('Motorista de Teste')
    } finally {
      clearDriverDemoSession()
    }

    expect(wrapper.find('header button[aria-label="Notificações"]').exists()).toBe(false)
    await setMockSession('student')
    await flushPromises()
    expect(wrapper.findComponent(DriverLayout).exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Motorista Demo 2')
  })

  describe.each(['desktop', 'mobile'] as const)('%s', variant => {
    it('mostra os três destinos e os ícones com navegação identificada', async () => {
      const { wrapper } = await application('/motorista/reservas')
      const nav = wrapper.findAllComponents(PortalNavigation).find(component => component.props('variant') === variant)!
      expect(nav.element.tagName).toBe('NAV')
      expect(nav.attributes('aria-label')).toBe('Navegação do motorista')
      expect(nav.findAll('a').map(link => ({ path: link.attributes('href'), label: link.text() })))
        .toEqual(destinations.map(({ path, label }) => ({ path, label })))
      expect(nav.findAll('svg')).toHaveLength(3)
      for (const link of nav.findAll('a')) {
        expect(link.get('svg').attributes('aria-hidden')).toBe('true')
        expect(link.attributes('tabindex')).toBeUndefined()
      }
    })

    it.each(destinations)('destaca somente $label em $path', async ({ path }) => {
      const { wrapper } = await application(path)
      const nav = wrapper.findAllComponents(PortalNavigation).find(component => component.props('variant') === variant)!
      expect(nav.findAll('a[aria-current="page"]')).toHaveLength(1)
      expect(nav.get('a[aria-current="page"]').attributes('href')).toBe(path)
      expect(nav.get('a[aria-current="page"]').classes()).toContain('router-link-exact-active')
    })

    it('navega entre as três páginas pelos RouterLinks', async () => {
      const { wrapper, router } = await application('/motorista/perfil')
      const nav = wrapper.findAllComponents(PortalNavigation).find(component => component.props('variant') === variant)!
      for (const { path, title } of destinations) {
        await nav.get('a[href="' + path + '"]').trigger('click')
        await flushPromises()
        expect(router.currentRoute.value.path).toBe(path)
        expect(wrapper.get('main h1').text()).toBe(title)
      }
    })
  })

  it('reutiliza as regiões responsivas e distribui três colunas no mobile', async () => {
    const { wrapper } = await application('/motorista/reservas')
    const [desktop, mobile] = wrapper.findAllComponents(PortalNavigation)
    expect([...desktop!.element.parentElement!.classList]).toEqual(expect.arrayContaining(['hidden', 'lg:block']))
    expect([...mobile!.element.parentElement!.classList]).toEqual(expect.arrayContaining(['sticky', 'bottom-0', 'lg:hidden']))
    expect(mobile!.get('ul').element.style.gridTemplateColumns).toMatch(/^repeat\(3, minmax\(0(?:px)?, 1fr\)\)$/)
    expect(mobile!.classes()).toContain('portal-navigation--mobile')
    expect(mobile!.get('a').classes()).toContain('min-h-16')
    expect(mobile!.get('a').classes()).not.toContain('min-w-0')
    expect(wrapper.get('main').element.parentElement!.nextElementSibling).toBe(mobile!.element.parentElement)
  })

  it('preserva as rotas e os quatro destinos do aluno ao trocar para sessão de aluno', async () => {
    const { wrapper, router } = await application('/motorista/reservas')
    expect(wrapper.find('header button[aria-label="Notificações"]').exists()).toBe(false)
    await setMockSession('student')
    for (const path of ['/', '/comprovante', '/reservar', '/reservas', '/notificacoes', '/avisos', '/perfil']) {
      await router.push(path)
      await flushPromises()
      const destination = ['/reservar', '/notificacoes', '/avisos'].includes(path) ? '/' : path
      expect(router.currentRoute.value.path).toBe(destination)
      expect(wrapper.findComponent(DriverLayout).exists()).toBe(false)
      expect(wrapper.findAllComponents(StudentNavigation)).toHaveLength(2)
      expect(wrapper.find('header button[aria-label="Notificações"]').exists()).toBe(true)
      for (const nav of wrapper.findAllComponents(StudentNavigation)) {
        expect(nav.findAll('a')).toHaveLength(4)
        expect(nav.attributes('aria-label')).toBe('Navegação do aluno')
        const active = nav.find('a[aria-current="page"]')
        expect(active.attributes('href')).toBe(destination)
      }
    }
  })

  it('preserva o catálogo de desenvolvimento e o retorno às páginas do motorista', async () => {
    const { wrapper, router } = await application('/motorista/reservas')
    expect(import.meta.env.DEV).toBe(true)
    await router.push('/design-system')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Design System')
    expect(wrapper.findComponent(PortalNavigation).exists()).toBe(false)
    expect(wrapper.findComponent(DriverLayout).exists()).toBe(false)
    await router.push('/motorista/perfil')
    await flushPromises()
    expect(wrapper.get('main h1').text()).toBe('Perfil do motorista')
    expect(wrapper.findAllComponents(PortalNavigation)).toHaveLength(2)
  })

  it('abre o histórico de solicitações com estado vazio e acesso às reservas', async () => {
    const { wrapper } = await application('/motorista/advertencias')
    expect(wrapper.get('main [role="status"]').text()).toBe('Você ainda não enviou solicitações de advertência.')
    expect(wrapper.get('main a').attributes('href')).toBe('/motorista/reservas')
    expect(wrapper.get('main').findAll('form, textarea, button, ul')).toHaveLength(0)
  })

  it('mantém Meu perfil como rótulo de navegação', async () => {
    const { wrapper } = await application('/motorista/perfil')
    expect(wrapper.get('main h1').text()).toBe('Perfil do motorista')
    for (const nav of wrapper.findAllComponents(PortalNavigation)) {
      expect(nav.get('a[aria-current="page"]').text()).toBe('Meu perfil')
    }
  })

  it('mantém rótulos completos com quebra de linha disponível no mobile', async () => {
    const { wrapper } = await application('/motorista/advertencias')
    const nav = wrapper.findAllComponents(PortalNavigation).find(component => component.props('variant') === 'mobile')!
    expect(nav.text()).toContain('Advertências')
    for (const label of nav.findAll('a span')) expect(label.classes()).toContain('wrap-anywhere')
    for (const item of nav.findAll('li')) expect(item.classes()).toContain('min-w-0')
  })
})

describe('Compatibilidade das rotas do motorista', () => {
  const legacy = ['/motorista', '/motorista/faculdades', '/motorista/passageiros', '/motorista/resumo']

  it.each(legacy)('redireciona %s para Reservas, sem acrescentar destinos aos menus', async path => {
    const { wrapper, router } = await application(path)
    expect(router.currentRoute.value.path).toBe('/motorista/reservas')
    expect(wrapper.get('main h1').text()).toBe('Reservas')
    for (const nav of wrapper.findAllComponents(PortalNavigation)) {
      expect(nav.findAll('a')).toHaveLength(3)
      expect(nav.get('a[aria-current="page"]').attributes('href')).toBe('/motorista/reservas')
      expect(nav.find('a[href="/motorista/passageiros"]').exists()).toBe(false)
      expect(nav.find('a[href="/motorista/resumo"]').exists()).toBe(false)
    }
  })

  it.each(legacy)('preserva query e fragmento ao redirecionar %s', async path => {
    const { router } = await application(path + '?origem=link-antigo#conteudo')
    expect(router.currentRoute.value.path).toBe('/motorista/reservas')
    expect(router.currentRoute.value.query).toEqual({ origem: 'link-antigo' })
    expect(router.currentRoute.value.hash).toBe('#conteudo')
  })

  it('mantém os links nomeados antigos e o perfil funcionando', async () => {
    const { router } = await application('/motorista/perfil')
    for (const name of ['driver-home', 'driver-college-distribution', 'driver-passengers', 'driver-summary']) {
      await router.push({ name })
      expect(router.currentRoute.value.path).toBe('/motorista/reservas')
    }
    await router.push({ name: 'driver-profile' })
    expect(router.currentRoute.value.path).toBe('/motorista/perfil')
  })
})
