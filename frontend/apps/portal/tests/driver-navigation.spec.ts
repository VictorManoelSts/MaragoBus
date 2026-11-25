import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { BaseCard } from '@maragobus/shared'
import App from '../src/App.vue'
import DriverLayout from '../src/layouts/DriverLayout.vue'
import DriverHomePage from '../src/pages/DriverHomePage.vue'
import StudentNavigation from '../src/components/StudentNavigation.vue'
import PortalNavigation from '../src/components/PortalNavigation.vue'
import { createPortalRouter } from '../src/router'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'
import { useSessionStore } from '@maragobus/shared/auth/session'

const destinations = [
  { path: '/motorista/reservas', label: 'Reservas', title: 'Reservas confirmadas' },
  { path: '/motorista/advertencias', label: 'Solicitações de advertência', title: 'Solicitações de advertência' },
  { path: '/motorista/perfil', label: 'Meu perfil', title: 'Perfil do motorista' },
]
const menuDestinations = [{ path: '/motorista', label: 'Início', title: 'Painel do motorista' }, ...destinations]

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
  it.each(destinations.slice(1))('abre diretamente $path com sessão de motorista e conteúdo provisório', async ({ path, title }) => {
    const { wrapper } = await application(path)
    expect(wrapper.findComponent(DriverLayout).exists()).toBe(true)
    expect(wrapper.findComponent(StudentNavigation).exists()).toBe(false)
    expect(wrapper.findAll('main')).toHaveLength(1)
    expect(wrapper.findAll('h1')).toHaveLength(1)
    expect(wrapper.get('main h1').text()).toBe(title)
    expect(wrapper.get('main p').text().length).toBeGreaterThan(20)
    expect(wrapper.findAllComponents(BaseCard)).toHaveLength(1)
    expect(wrapper.findComponent(BaseCard).text()).toBe('Esta funcionalidade será implementada posteriormente.')
    expect(wrapper.get('main').findAll('table, input, form, select, ul')).toHaveLength(0)
    expect(wrapper.get('main').findAll('button').map(button => button.text())).toEqual(path === '/motorista/perfil' ? ['Sair'] : [])
    expect(wrapper.get('header img').attributes('src')).toContain('logo-horizontal.svg')
  })

  describe.each(['desktop', 'mobile'] as const)('%s', variant => {
    it('mostra os quatro destinos e os ícones com navegação identificada', async () => {
      const { wrapper } = await application('/motorista/reservas')
      const nav = wrapper.findAllComponents(PortalNavigation).find(component => component.props('variant') === variant)!
      expect(nav.element.tagName).toBe('NAV')
      expect(nav.attributes('aria-label')).toBe('Navegação do motorista')
      expect(nav.findAll('a').map(link => ({ path: link.attributes('href'), label: link.text() })))
        .toEqual(menuDestinations.map(({ path, label }) => ({ path, label })))
      expect(nav.findAll('svg')).toHaveLength(4)
      for (const link of nav.findAll('a')) {
        expect(link.get('svg').attributes('aria-hidden')).toBe('true')
        expect(link.attributes('tabindex')).toBeUndefined()
      }
    })

    it.each(menuDestinations)('destaca somente $label em $path', async ({ path }) => {
      const { wrapper } = await application(path)
      const nav = wrapper.findAllComponents(PortalNavigation).find(component => component.props('variant') === variant)!
      expect(nav.findAll('a[aria-current="page"]')).toHaveLength(1)
      expect(nav.get('a[aria-current="page"]').attributes('href')).toBe(path)
      expect(nav.get('a[aria-current="page"]').classes()).toContain('router-link-exact-active')
    })

    it('navega entre as quatro páginas pelos RouterLinks', async () => {
      const { wrapper, router } = await application('/motorista/perfil')
      const nav = wrapper.findAllComponents(PortalNavigation).find(component => component.props('variant') === variant)!
      for (const { path, title } of menuDestinations) {
        await nav.get('a[href="' + path + '"]').trigger('click')
        await flushPromises()
        expect(router.currentRoute.value.path).toBe(path)
        expect(wrapper.get('main h1').text()).toBe(title)
      }
    })
  })

  it('reutiliza as regiões responsivas e distribui quatro colunas no mobile', async () => {
    const { wrapper } = await application('/motorista/reservas')
    const [desktop, mobile] = wrapper.findAllComponents(PortalNavigation)
    expect([...desktop!.element.parentElement!.classList]).toEqual(expect.arrayContaining(['hidden', 'lg:block']))
    expect([...mobile!.element.parentElement!.classList]).toEqual(expect.arrayContaining(['sticky', 'bottom-0', 'lg:hidden']))
    expect(mobile!.get('ul').element.style.gridTemplateColumns).toMatch(/^repeat\(4, minmax\(0(?:px)?, 1fr\)\)$/)
    expect(mobile!.classes()).toContain('portal-navigation--mobile')
    expect(mobile!.get('a').classes()).toContain('min-h-16')
    expect(wrapper.get('main').element.parentElement!.nextElementSibling).toBe(mobile!.element.parentElement)
  })

  it('exibe o painel e saúda o motorista autenticado', async () => {
    const { wrapper, router } = await application('/motorista')
    expect(router.currentRoute.value.name).toBe('driver-home')
    expect(wrapper.get('main h1').text()).toBe('Painel do motorista')
    expect(wrapper.get('main header p').text()).toBe('Olá, Motorista de Teste!')
  })

  it('exibe saudação genérica quando o nome está vazio', async () => {
    const { router } = await application('/motorista')
    const session = useSessionStore()
    session.user = { ...session.user!, name: '   ' }
    const page = mount(DriverHomePage, { global: { plugins: [router] } })
    expect(page.get('header p').text()).toBe('Olá!')
  })

  it('identifica a consulta disponível e os dois serviços pendentes', async () => {
    const { wrapper } = await application('/motorista')
    const main = wrapper.get('main')
    const cards = main.findAllComponents(BaseCard)
    expect(main.findAll('h3').map(heading => heading.text())).toEqual([
      'Consultar reservas dos alunos', 'Solicitar advertências', 'Consultar distribuição de faculdades',
    ])
    expect(cards).toHaveLength(3)
    expect(cards[0]!.text()).toContain('Disponível')
    expect(cards[0]!.get('a').text()).toBe('Consultar reservas')
    for (const card of cards.slice(1)) expect(card.text()).toContain('Em desenvolvimento')
    expect(main.findAll('table, dl, form, input, select, button')).toHaveLength(0)
    expect(main.text()).not.toMatch(/\d/)
  })

  it.each([...destinations.slice(0, 2), {
    path: '/motorista/faculdades', title: 'Distribuição de faculdades',
  }])('abre as informações de $title pelo painel', async ({ path, title }) => {
    const { wrapper, router } = await application('/motorista')
    await wrapper.get(`main a[href="${path}"]`).trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(path)
    expect(wrapper.get('main h1').text()).toBe(title)
    if (path === '/motorista/reservas') {
      expect(wrapper.find('main input[type="date"]').exists()).toBe(true)
    } else {
      expect(wrapper.get('main').text()).toContain('Esta funcionalidade será implementada posteriormente.')
    }
  })

  it('preserva as rotas e os cinco destinos do aluno ao trocar para sessão de aluno', async () => {
    const { wrapper, router } = await application('/motorista/reservas')
    await setMockSession('student')
    for (const path of ['/', '/reservar', '/reservas', '/notificacoes', '/perfil']) {
      await router.push(path)
      await flushPromises()
      expect(router.currentRoute.value.path).toBe(path)
      expect(wrapper.findComponent(DriverLayout).exists()).toBe(false)
      expect(wrapper.findAllComponents(StudentNavigation)).toHaveLength(2)
      for (const nav of wrapper.findAllComponents(StudentNavigation)) {
        expect(nav.findAll('a')).toHaveLength(5)
        expect(nav.attributes('aria-label')).toBe('Navegação do aluno')
        expect(nav.get('a[aria-current="page"]').attributes('href')).toBe(path)
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

  it('descreve Solicitações de advertência sem formulário nem estados operacionais simulados', async () => {
    const { wrapper } = await application('/motorista/advertencias')
    expect(wrapper.get('main p').text()).toBe(
      'Espaço para solicitar futuramente advertências para alunos com motivo e consultar suas próprias solicitações nos estados Pendente, Aprovada e Recusada.',
    )
    expect(wrapper.get('main').findAll('form, textarea, input, select, button, table, ul')).toHaveLength(0)
    expect(wrapper.findComponent(BaseCard).text()).toBe('Esta funcionalidade será implementada posteriormente.')
  })

  it('preserva título, descrição e card da página de perfil, ajustando apenas seu rótulo de navegação', async () => {
    const { wrapper } = await application('/motorista/perfil')
    expect(wrapper.get('main h1').text()).toBe('Perfil do motorista')
    expect(wrapper.get('main p').text()).toBe('Espaço para consultar as informações do perfil do motorista.')
    expect(wrapper.findComponent(BaseCard).text()).toBe('Esta funcionalidade será implementada posteriormente.')
    for (const nav of wrapper.findAllComponents(PortalNavigation)) {
      expect(nav.get('a[aria-current="page"]').text()).toBe('Meu perfil')
    }
  })

  it('mantém rótulos completos com quebra de linha disponível no mobile', async () => {
    const { wrapper } = await application('/motorista/advertencias')
    const nav = wrapper.findAllComponents(PortalNavigation).find(component => component.props('variant') === 'mobile')!
    expect(nav.text()).toContain('Solicitações de advertência')
    for (const label of nav.findAll('a span')) expect(label.classes()).toContain('wrap-anywhere')
    for (const item of nav.findAll('li')) expect(item.classes()).toContain('min-w-0')
  })
})

describe('Compatibilidade das rotas do motorista', () => {
  const legacy = ['/motorista/passageiros', '/motorista/resumo']

  it.each(legacy)('redireciona %s para Reservas, sem acrescentar destinos aos menus', async path => {
    const { wrapper, router } = await application(path)
    expect(router.currentRoute.value.path).toBe('/motorista/reservas')
    expect(wrapper.get('main h1').text()).toBe('Reservas confirmadas')
    for (const nav of wrapper.findAllComponents(PortalNavigation)) {
      expect(nav.findAll('a')).toHaveLength(4)
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

  it('mantém os links nomeados de Passageiros, Resumo e Perfil funcionando', async () => {
    const { router } = await application('/motorista/perfil')
    for (const name of ['driver-passengers', 'driver-summary']) {
      await router.push({ name })
      expect(router.currentRoute.value.path).toBe('/motorista/reservas')
    }
    await router.push({ name: 'driver-profile' })
    expect(router.currentRoute.value.path).toBe('/motorista/perfil')
  })
})
