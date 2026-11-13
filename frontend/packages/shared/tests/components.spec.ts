import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { Search } from '@lucide/vue'
import {
  BaseAlert, BaseBadge, BaseButton, BaseCard, BaseInput, BaseSelect, BrandLogo,
} from '../src'
import type { BadgeVariant, BrandVariant, ButtonVariant, FeedbackVariant } from '../src'

describe('BaseButton', () => {
  it.each<ButtonVariant>(['primary', 'secondary', 'outline', 'ghost'])('renderiza a variante %s', variant => {
    const wrapper = mount(BaseButton, { props: { variant }, slots: { default: 'Continuar' } })
    expect(wrapper.classes()).toContain('mb-button--' + variant)
    expect(wrapper.attributes('type')).toBe('button')
    expect(wrapper.text()).toBe('Continuar')
  })
  it.each(['sm', 'md', 'lg'] as const)('aplica tamanho %s', size => {
    expect(mount(BaseButton, { props: { size } }).classes()).toContain('mb-button--' + size)
  })
  it('emite clique e aceita ícone funcional', async () => {
    const wrapper = mount(BaseButton, { props: { icon: Search, type: 'submit' }, slots: { default: 'Buscar' } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
    expect(wrapper.attributes('type')).toBe('submit')
    expect(wrapper.get('.mb-button__icon').attributes('aria-hidden')).toBe('true')
  })
  it.each([{ disabled: true, loading: false }, { disabled: false, loading: true }])('bloqueia cliques em %j', async props => {
    const wrapper = mount(BaseButton, { props, slots: { default: 'Salvar' } })
    expect(wrapper.element.disabled).toBe(true)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
    if (props.loading) {
      expect(wrapper.attributes('aria-busy')).toBe('true')
      expect(wrapper.text()).toContain('Carregando')
    }
  })
})

describe('BaseInput', () => {
  it('associa label, ajuda, erro e descrição externa ao campo', () => {
    const wrapper = mount(BaseInput, {
      props: { id: 'email', label: 'E-mail', type: 'email', help: 'Use seu e-mail', error: 'E-mail inválido' },
      attrs: { name: 'email', required: true, 'aria-describedby': 'externo' },
    })
    const input = wrapper.get('input')
    expect(wrapper.get('label').attributes('for')).toBe(input.attributes('id'))
    expect(input.attributes('aria-describedby')).toBe('externo email-help email-error')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('type')).toBe('email')
    expect(input.attributes('name')).toBe('email')
    expect(input.attributes('required')).toBeDefined()
    expect(wrapper.get('#email-error').attributes('role')).toBe('alert')
  })
  it('emite v-model, atualiza valor e remove estado de erro', async () => {
    const wrapper = mount(BaseInput, { props: { label: 'Nome', modelValue: '', error: 'Obrigatório' } })
    await wrapper.get('input').setValue('Ana')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Ana'])
    await wrapper.setProps({ modelValue: 'Maria', error: undefined })
    expect(wrapper.get('input').element.value).toBe('Maria')
    expect(wrapper.get('input').attributes('aria-invalid')).toBeUndefined()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
  it('aplica o modificador number sem transformar vazio em zero', async () => {
    const wrapper = mount(BaseInput, { props: { label: 'Quantidade', type: 'number', modelModifiers: { number: true } } })
    await wrapper.get('input').setValue('12')
    await wrapper.get('input').setValue('')
    expect(wrapper.emitted('update:modelValue')).toEqual([[12], ['']])
  })
  it('gera IDs distintos e suporta disabled', () => {
    const wrapper = mount(defineComponent({
      components: { BaseInput },
      template: '<div><BaseInput label="Primeiro" disabled /><BaseInput label="Segundo" /></div>',
    }))
    const [first, second] = wrapper.findAll('input')
    expect(first!.element.disabled).toBe(true)
    expect(first!.element.id).not.toBe(second!.element.id)
  })
})

describe('BaseSelect', () => {
  const options = [{ value: 'a', label: 'Opção A' }, { value: 2, label: 'Opção B' }, { value: 'x', label: 'Indisponível', disabled: true }]
  it('renderiza placeholder, opções e estados acessíveis', () => {
    const wrapper = mount(BaseSelect, { props: { label: 'Opções', options, help: 'Escolha uma', error: 'Obrigatório' } })
    const select = wrapper.get('select')
    expect(wrapper.get('label').attributes('for')).toBe(select.attributes('id'))
    expect(wrapper.findAll('option')).toHaveLength(4)
    expect(wrapper.findAll('option')[0]!.element.disabled).toBe(true)
    expect(wrapper.findAll('option')[3]!.element.disabled).toBe(true)
    expect(select.attributes('aria-invalid')).toBe('true')
    expect(select.attributes('aria-describedby')).toContain('-error')
    // Um select nativo mantém o suporte de teclado do navegador.
    expect(select.attributes('role')).toBeUndefined()
  })
  it('preserva valores numéricos e reage ao v-model externo', async () => {
    const wrapper = mount(BaseSelect, { props: { label: 'Opção', options, modelValue: '' } })
    await wrapper.get('select').setValue(2)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([2])
    await wrapper.setProps({ modelValue: 'a', disabled: true })
    expect(wrapper.get('select').element.value).toBe('a')
    expect(wrapper.get('select').element.disabled).toBe(true)
  })
})

describe('BaseCard', () => {
  it('mostra slots opcionais apenas quando fornecidos', () => {
    const simple = mount(BaseCard, { slots: { default: 'Conteúdo' } })
    expect(simple.text()).toBe('Conteúdo')
    expect(simple.find('.mb-card__header').exists()).toBe(false)
    expect(simple.find('.mb-card__footer').exists()).toBe(false)
    const full = mount(BaseCard, { slots: { header: 'Título', default: 'Corpo', footer: 'Ações' } })
    expect(full.get('.mb-card__header').text()).toBe('Título')
    expect(full.get('.mb-card__footer').text()).toBe('Ações')
  })
})

describe('BaseBadge', () => {
  it.each<BadgeVariant>(['neutral', 'success', 'warning', 'danger', 'info'])('aplica %s sem depender só da cor', variant => {
    const wrapper = mount(BaseBadge, { props: { variant, size: 'sm' }, slots: { default: 'Estado explícito' } })
    expect(wrapper.classes()).toContain('mb-feedback--' + variant)
    expect(wrapper.classes()).toContain('mb-badge--sm')
    expect(wrapper.text()).toBe('Estado explícito')
  })
})

describe('BaseAlert', () => {
  it.each<FeedbackVariant>(['success', 'warning', 'danger', 'info'])('exibe título, conteúdo e ícone de %s', variant => {
    const wrapper = mount(BaseAlert, { props: { variant, title: 'Mensagem' }, slots: { default: 'Detalhes' } })
    expect(wrapper.classes()).toContain('mb-feedback--' + variant)
    expect(wrapper.attributes('role')).toBe(variant === 'danger' ? 'alert' : 'status')
    expect(wrapper.text()).toContain('Mensagem')
    expect(wrapper.text()).toContain('Detalhes')
    expect(wrapper.get('svg').attributes('aria-hidden')).toBe('true')
  })
  it('permite omitir título e ícone e controlar a urgência', () => {
    const wrapper = mount(BaseAlert, { props: { showIcon: false, role: 'status', variant: 'danger' } })
    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.find('.mb-alert__title').exists()).toBe(false)
    expect(wrapper.attributes('role')).toBe('status')
  })
})

describe('BrandLogo', () => {
  it.each<BrandVariant>(['horizontal', 'with-subtitle', 'icon-blue', 'icon-dark'])('referencia o arquivo oficial %s', variant => {
    const names = { horizontal: 'logo-horizontal.svg', 'with-subtitle': 'logo-com-subititulo.svg', 'icon-blue': 'icone-azul.svg', 'icon-dark': 'icone-escuro.svg' }
    const wrapper = mount(BrandLogo, { props: { variant } })
    expect(wrapper.attributes('src')).toContain(names[variant])
    expect(wrapper.attributes('alt')).toBe('MaragoBus')
    expect(wrapper.element.tagName).toBe('IMG')
  })
})
