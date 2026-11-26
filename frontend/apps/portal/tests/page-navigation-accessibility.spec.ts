import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'
import App from '../src/App.vue'
import PortalLayout from '../src/layouts/PortalLayout.vue'
import { createPortalRouter } from '../src/router'

afterEach(() => {
  vi.restoreAllMocks()
  document.title = ''
})

describe('Título e foco do Portal', () => {
  it('usa o título da rota de login após redirecionar uma sessão anônima', async () => {
    const router = createPortalRouter(createMemoryHistory())
    await router.push('/motorista/reservas')
    expect(router.currentRoute.value.name).toBe('login')
    expect(document.title).toBe('Entrar — MaragoBus')
  })

  it.each([
    { role: 'student', initial: '/reservas', title: 'Minhas reservas', next: '/comprovante', nextTitle: 'Comprovante' },
    { role: 'student', initial: '/comprovante', title: 'Comprovante', next: '/perfil', nextTitle: 'Meu perfil' },
    { role: 'driver', initial: '/motorista/reservas', title: 'Reservas',
      next: '/motorista/advertencias', nextTitle: 'Solicitações de advertência' },
  ] as const)('atualiza título e foco somente ao trocar de página para $role', async ({
    role, initial, title, next, nextTitle,
  }) => {
    await setMockSession(role)
    const router = createPortalRouter(createMemoryHistory())
    await router.push(initial)
    const wrapper = mount(App, { attachTo: document.body, global: { plugins: [router] } })
    expect(document.title).toBe(title + ' — MaragoBus')
    const link = wrapper.get<HTMLAnchorElement>('nav a[href="' + next + '"]')
    const main = wrapper.get('main').element
    expect(document.activeElement).not.toBe(main)

    link.element.focus()
    await router.push({ path: initial, query: { filtro: '1' }, hash: '#portal-content' })
    expect(document.activeElement).toBe(link.element)
    expect(document.title).toBe(title + ' — MaragoBus')

    const removeGuard = router.beforeEach(() => false)
    await router.push(next)
    expect(document.activeElement).toBe(link.element)
    expect(document.title).toBe(title + ' — MaragoBus')
    removeGuard()

    const navigated = new Promise<void>(resolve => {
      const stop = router.afterEach(() => {
        stop()
        resolve()
      })
    })
    await link.trigger('click')
    await navigated
    await flushPromises()
    expect(document.title).toBe(nextTitle + ' — MaragoBus')
    expect(document.activeElement).toBe(wrapper.get('main').element)
    expect(wrapper.find('a[href="#portal-content"]').exists()).toBe(true)
  })

  it('usa os metadados do destino final de um atalho legado', async () => {
    await setMockSession('driver')
    const router = createPortalRouter(createMemoryHistory())
    await router.push('/motorista/faculdades')
    expect(router.currentRoute.value.path).toBe('/motorista/reservas')
    expect(document.title).toBe('Reservas — MaragoBus')
  })
})

it('compensa a altura da barra sticky e rola apenas quando ela encobre o foco', () => {
  let frame: FrameRequestCallback | undefined
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    frame = callback
    return 1
  })
  const scroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
  vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(600)
  const wrapper = mount(PortalLayout, {
    attachTo: document.body,
    slots: { default: '<button>Continuar</button>', 'mobile-navigation': '<nav>Menu</nav>' },
  })
  const nav = wrapper.get('nav').element.parentElement!
  nav.style.position = 'sticky'
  vi.spyOn(nav, 'offsetHeight', 'get').mockReturnValue(84)
  vi.spyOn(nav, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 516, 400, 84))
  window.dispatchEvent(new Event('resize'))
  const inset = () => document.documentElement.style.getPropertyValue('--portal-mobile-scroll-inset')
  expect(inset()).toBe('84px')
  const target = wrapper.get('button').element
  const targetRect = vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 540, 80, 40))
  target.focus()
  frame?.(0)
  expect(scroll).toHaveBeenLastCalledWith({ top: 72, behavior: 'instant' })

  target.blur()
  targetRect.mockReturnValue(new DOMRect(0, 460, 80, 40))
  target.focus()
  frame?.(0)
  expect(scroll).toHaveBeenCalledTimes(1)

  nav.style.position = 'static'
  window.dispatchEvent(new Event('resize'))
  expect(inset()).toBe('0px')
  target.blur()
  targetRect.mockReturnValue(new DOMRect(0, 540, 80, 40))
  target.focus()
  frame?.(0)
  expect(scroll).toHaveBeenCalledTimes(1)

  wrapper.unmount()
  expect(inset()).toBe('')
})
