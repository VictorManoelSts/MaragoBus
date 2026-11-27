import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { BaseBadge, BaseCard, BrandLogo } from '@maragobus/shared'
import AdminLayout from '../src/layouts/AdminLayout.vue'
import HomePage from '../src/pages/HomePage.vue'

describe('AdminLayout', () => {
  it('renderiza cabeçalho e um único main semântico', () => {
    const wrapper = mount(AdminLayout)
    expect(wrapper.findAll('header')).toHaveLength(1)
    expect(wrapper.findAll('main')).toHaveLength(1)
    expect(wrapper.get('header').find('main').exists()).toBe(false)
    expect(wrapper.find('header button[aria-label="Notificações"]').exists()).toBe(false)
  })

  it('usa o BrandLogo oficial e identifica a área administrativa', () => {
    const wrapper = mount(AdminLayout)
    expect(wrapper.findComponent(BrandLogo).exists()).toBe(true)
    expect(wrapper.get('header img').attributes('src')).toContain('logo-horizontal.svg')
    expect(wrapper.get('header img').attributes('alt')).toBe('MaragoBus')
    expect(wrapper.findComponent(BaseBadge).text()).toBe('Área administrativa')
  })

  it('renderiza o conteúdo da página dentro do main', () => {
    const wrapper = mount(AdminLayout, { slots: { default: '<section><h1>Conteúdo</h1><p>Descrição</p></section>' } })
    expect(wrapper.get('main h1').text()).toBe('Conteúdo')
    expect(wrapper.get('main p').text()).toBe('Descrição')
  })

  it('não cria navegação, ações fictícias ou regiões vazias', () => {
    const wrapper = mount(AdminLayout)
    expect(wrapper.findAll('nav, aside, button')).toHaveLength(0)
    expect(wrapper.findAll('div').some(region => region.classes().includes('shrink-0'))).toBe(false)
    expect(wrapper.findAll('div').some(region => region.classes().includes('lg:hidden'))).toBe(false)
  })

  it('oferece slots opcionais para a próxima etapa sem implementar menus', () => {
    const wrapper = mount(AdminLayout, {
      slots: { 'desktop-navigation': '<p>Slot desktop</p>', 'mobile-navigation': '<p>Slot mobile</p>' },
    })
    const desktop = wrapper.findAll('div').find(region => region.classes().includes('shrink-0'))!
    const mobile = wrapper.findAll('div').find(region => region.classes().includes('lg:hidden'))!
    expect(desktop.classes()).toEqual(expect.arrayContaining(['hidden', 'lg:block']))
    expect(desktop.text()).toBe('Slot desktop')
    expect(mobile.text()).toBe('Slot mobile')
  })

  it('mantém a largura fluida e usa espaçamento e tokens responsivos', () => {
    const wrapper = mount(AdminLayout)
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['min-h-svh', 'min-w-0', 'bg-app', 'text-content']))
    expect(wrapper.get('main').classes()).toEqual(expect.arrayContaining([
      'min-w-0', 'flex-1', 'wrap-anywhere', 'px-4', 'sm:px-6', 'lg:px-8', 'py-8', 'sm:py-10', 'lg:py-12',
    ]))
    expect(wrapper.get('main').element.parentElement!.classList.contains('w-full')).toBe(true)
    expect(wrapper.findAll('[class]').flatMap(element => element.classes()).some(name => name.startsWith('max-w-'))).toBe(false)
    expect(wrapper.get('header > div').classes()).toEqual(expect.arrayContaining(['flex-wrap', 'items-center']))
  })

  it('preserva conteúdo extenso no fluxo e oferece salto para o main', () => {
    const content = 'conteudo-extenso'.repeat(100)
    const wrapper = mount(AdminLayout, { slots: { default: '<p>' + content + '</p>' } })
    expect(wrapper.get('main p').text()).toBe(content)
    expect(wrapper.get('a').attributes('href')).toBe('#' + wrapper.get('main').attributes('id'))
    expect(wrapper.get('a').classes()).toContain('focus:not-sr-only')
    expect(wrapper.get('main').attributes('tabindex')).toBe('-1')
  })
})

describe('Página inicial administrativa', () => {
  it('integra AdminLayout e BaseCard com o conteúdo solicitado', () => {
    const wrapper = mount(AdminLayout, { props: { title: 'Painel administrativo' }, slots: { default: HomePage } })
    expect(wrapper.findComponent(AdminLayout).exists()).toBe(true)
    expect(wrapper.get('header h1').text()).toBe('Painel administrativo')
    expect(wrapper.get('main').attributes('aria-labelledby')).toBe(wrapper.get('header h1').attributes('id'))
    expect(wrapper.get('header h1').classes()).toContain('wrap-anywhere')
    expect(wrapper.get('header h1').element.parentElement?.classList).toContain('w-full')
    expect(wrapper.get('main p').text()).toBe('Gerenciamento do transporte universitário MaragoBus')
    expect(wrapper.findComponent(BaseCard).text()).toBe('As funcionalidades administrativas serão implementadas posteriormente.')
    expect(wrapper.findAll('main')).toHaveLength(1)
    expect(wrapper.findAll('img')).toHaveLength(1)
    expect(wrapper.findAll('nav, aside, button, input, table, canvas')).toHaveLength(0)
  })
})
