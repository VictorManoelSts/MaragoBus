import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '../src/App.vue'
import AdminSidebar from '../src/components/AdminSidebar.vue'
import AdminMobileNavigation from '../src/components/AdminMobileNavigation.vue'
import { createAdminRouter } from '../src/router'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'

const destinations = [
  { path: '/', label: 'Visão geral' },
  { path: '/alunos', label: 'Alunos' },
  { path: '/motoristas', label: 'Motoristas' },
  { path: '/faculdades', label: 'Faculdades' },
  { path: '/pontos-embarque', label: 'Pontos de embarque' },
  { path: '/advertencias', label: 'Solicitações de advertência' },
  { path: '/perfil', label: 'Meu perfil' },
  { path: '/cursos', label: 'Cursos' },
  { path: '/cursos-ofertados', label: 'Cursos ofertados' },
  { path: '/reservas', label: 'Reservas' },
]
let desktop = false
const listeners = new Set<() => void>()
const addListener = vi.fn((_type: string, callback: () => void) => listeners.add(callback))
const removeListener = vi.fn((_type: string, callback: () => void) => listeners.delete(callback))

beforeEach(() => {
  desktop = false
  listeners.clear()
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    get matches() { return desktop },
    addEventListener: addListener, removeEventListener: removeListener,
  })))
})
afterEach(() => {
  vi.unstubAllGlobals()
  document.documentElement.style.overflow = ''
})

async function application(path = '/') {
  await setMockSession('admin')
  const router = createAdminRouter(createMemoryHistory())
  await router.push(path)
  await router.isReady()
  const wrapper = mount(App, { attachTo: document.body, global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router, trigger: wrapper.get<HTMLButtonElement>('button[aria-label="Abrir menu"]') }
}
function drawer() { return document.querySelector<HTMLDialogElement>('.admin-drawer')! }
async function backdrop(x = 370, y = 200) {
  vi.spyOn(drawer(), 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: 336, bottom: 844, width: 336, height: 844, toJSON() {},
  })
  drawer().dispatchEvent(new MouseEvent('pointerdown', { clientX: x, clientY: y, bubbles: true }))
  drawer().dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }))
  await flushPromises()
}

describe('Navegação administrativa mobile', () => {
  it('renderiza botão Menu com nome, expansão e associação ao dialog', async () => {
    const { trigger } = await application()
    expect(trigger.attributes('aria-label')).toBe('Abrir menu')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(trigger.attributes('aria-controls')).toBe(drawer().id)
    expect(trigger.attributes('aria-haspopup')).toBe('dialog')
    expect(trigger.classes()).toContain('lg:hidden')
    expect(trigger.get('svg').attributes('aria-hidden')).toBe('true')
    expect(drawer().open).toBe(false)
  })

  it('abre modal nativo e fecha pelo botão, restaurando o foco', async () => {
    const { trigger } = await application()
    await trigger.trigger('click')
    expect(drawer().open).toBe(true)
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce()
    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(drawer().getAttribute('aria-modal')).toBe('true')
    expect(document.getElementById(drawer().getAttribute('aria-labelledby')!)?.textContent).toBe('Menu administrativo')
    const close = drawer().querySelector<HTMLButtonElement>('[aria-label="Fechar menu"]')!
    expect(document.activeElement).toBe(close)
    close.click()
    await flushPromises()
    expect(drawer().open).toBe(false)
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger.element)
  })

  it('apresenta os mesmos dez destinos e ícones da sidebar', async () => {
    const { wrapper, trigger } = await application()
    await trigger.trigger('click')
    const links = [...drawer().querySelectorAll('nav a')]
    expect(links.map(link => ({ path: link.getAttribute('href'), label: link.textContent?.trim() }))).toEqual(destinations)
    expect(drawer().querySelectorAll('nav svg')).toHaveLength(10)
    const groups = [...drawer().querySelectorAll('nav section')]
    expect(groups.map(group => group.querySelector('h3')?.textContent)).toEqual(['Principal', 'Gerenciamento complementar'])
    expect(groups.map(group => group.querySelectorAll('a').length)).toEqual([7, 3])
    const headingIds = [...document.querySelectorAll('nav h3')].map(heading => heading.id)
    expect(new Set(headingIds).size).toBe(4)
    expect(drawer().querySelector('nav')?.getAttribute('aria-label')).toBe('Navegação administrativa')
    expect(wrapper.findComponent(AdminSidebar).findAll('a').map(link => link.text())).toEqual(destinations.map(item => item.label))
  })

  it.each(destinations)('indica somente $label como rota ativa em $path', async ({ path }) => {
    const { trigger } = await application(path)
    await trigger.trigger('click')
    const current = drawer().querySelectorAll('a[aria-current="page"]')
    expect(current).toHaveLength(1)
    expect(current[0]!.getAttribute('href')).toBe(path)
    expect(current[0]!.classList.contains('router-link-exact-active')).toBe(true)
  })

  it('fecha por Escape e restaura expansão, rolagem e foco', async () => {
    const { trigger } = await application()
    await trigger.trigger('click')
    const event = new Event('cancel', { cancelable: true })
    drawer().dispatchEvent(event)
    await flushPromises()
    expect(event.defaultPrevented).toBe(true)
    expect(drawer().open).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
    expect(document.body.style.overflow).toBe('')
  })

  it('fecha somente quando pointerdown e click acontecem no backdrop', async () => {
    const { trigger } = await application()
    await trigger.trigger('click')
    await backdrop(100, 100)
    expect(drawer().open).toBe(true)
    // Arrastar de dentro para fora não deve descartar o menu.
    drawer().dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, clientY: 100 }))
    drawer().dispatchEvent(new MouseEvent('click', { clientX: 370, clientY: 100 }))
    expect(drawer().open).toBe(true)
    await backdrop()
    expect(drawer().open).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
  })

  it('fecha após selecionar um destino e leva o foco ao conteúdo principal', async () => {
    const { wrapper, trigger, router } = await application()
    await trigger.trigger('click')
    drawer().querySelector<HTMLAnchorElement>('a[href="/alunos"]')!.click()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/alunos')
    expect(drawer().open).toBe(false)
    expect(wrapper.get('main h1').text()).toBe('Alunos')
    expect(document.activeElement).toBe(wrapper.get('main').element)
  })

  it('fecha mesmo ao selecionar a página atual', async () => {
    const { trigger } = await application('/reservas')
    await trigger.trigger('click')
    drawer().querySelector<HTMLAnchorElement>('a[href="/reservas"]')!.click()
    await flushPromises()
    expect(drawer().open).toBe(false)
  })

  it('preserva links modificados para nova aba sem fechar o drawer', async () => {
    const { trigger, router } = await application()
    await trigger.trigger('click')
    const link = drawer().querySelector('a[href="/alunos"]')!
    // jsdom não implementa a abertura de uma nova aba; impede apenas essa ação padrão.
    link.addEventListener('click', event => event.preventDefault(), { once: true })
    link.dispatchEvent(new MouseEvent('click', { ctrlKey: true, bubbles: true, cancelable: true }))
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/')
    expect(drawer().open).toBe(true)
  })

  it('fecha após navegação externa ao menu e preserva a sidebar', async () => {
    const { trigger, router, wrapper } = await application()
    await trigger.trigger('click')
    await router.push('/perfil')
    await flushPromises()
    expect(drawer().open).toBe(false)
    expect(wrapper.findComponent(AdminSidebar).get('a[aria-current="page"]').text()).toBe('Meu perfil')
  })

  it('contém Tab e Shift+Tab dentro do menu', async () => {
    const { trigger } = await application()
    await trigger.trigger('click')
    const first = drawer().querySelector<HTMLButtonElement>('[data-menu-close]')!
    const last = [...drawer().querySelectorAll<HTMLAnchorElement>('nav a')].at(-1)!
    last.focus()
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    last.dispatchEvent(tab)
    expect(tab.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(first)
    const back = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })
    first.dispatchEvent(back)
    expect(back.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(last)
  })

  it('bloqueia e restaura os valores anteriores de overflow de body e html', async () => {
    const { trigger } = await application()
    document.body.style.overflow = 'scroll'
    document.documentElement.style.overflow = 'auto'
    await trigger.trigger('click')
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.documentElement.style.overflow).toBe('hidden')
    drawer().querySelector<HTMLButtonElement>('[data-menu-close]')!.click()
    await flushPromises()
    expect(document.body.style.overflow).toBe('scroll')
    expect(document.documentElement.style.overflow).toBe('auto')
  })

  it('fecha ao atingir lg e focaliza o main, em vez do botão agora oculto', async () => {
    const { trigger, wrapper } = await application()
    await trigger.trigger('click')
    desktop = true
    listeners.forEach(callback => callback())
    await flushPromises()
    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 64rem)')
    expect(drawer().open).toBe(false)
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(wrapper.get('main').element)
    expect(wrapper.findComponent(AdminSidebar).exists()).toBe(true)
  })

  it('não abre no desktop mesmo se o botão oculto receber um evento sintético', async () => {
    desktop = true
    const { trigger } = await application()
    await trigger.trigger('click')
    expect(drawer().open).toBe(false)
  })

  it('restaura recursos ao desmontar ou sair para o catálogo', async () => {
    const { trigger, wrapper, router } = await application()
    await trigger.trigger('click')
    await router.push('/design-system')
    await flushPromises()
    expect(document.querySelector('.admin-drawer')).toBeNull()
    expect(wrapper.findComponent(AdminMobileNavigation).exists()).toBe(false)
    expect(wrapper.get('h1').text()).toBe('Design System')
    expect(document.body.style.overflow).toBe('')
    expect(document.documentElement.style.overflow).toBe('')
    expect(removeListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('sincroniza um fechamento pela API nativa sem deixar o fundo bloqueado', async () => {
    const { trigger } = await application()
    await trigger.trigger('click')
    drawer().close()
    await flushPromises()
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(document.body.style.overflow).toBe('')
  })
})
