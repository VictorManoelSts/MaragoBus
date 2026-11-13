import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { BaseCard, BrandLogo } from '@maragobus/shared'
import App from '../src/App.vue'
import { createPortalRouter } from '../src/router'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'
import PortalLayout from '../src/layouts/PortalLayout.vue'

const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))

async function application() {
  const router = createPortalRouter(createMemoryHistory())
  await router.push('/login')
  await router.isReady()
  const wrapper = mount(App, { attachTo: document.body, global: { plugins: [router] } })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}

describe('Interface de login do Portal', () => {
  it('renderiza /login com as marcas oficiais e sem navegação dos perfis', async () => {
    const { wrapper, router } = await application()
    expect(router.currentRoute.value.name).toBe('login')
    expect(wrapper.get('h1').text()).toBe('Bem-vindo')
    expect(wrapper.findComponent(BrandLogo).exists()).toBe(true)
    expect(wrapper.get('img[alt="MaragoBus"]').attributes('src')).toContain('logo-horizontal.svg')
    expect(wrapper.get('img[alt="Prefeitura de Maragogi"]').attributes('src')).toContain('logo-maragogi.png')
    expect(wrapper.findComponent(PortalLayout).exists()).toBe(false)
    expect(wrapper.find('aside, nav').exists()).toBe(false)
    expect(wrapper.findAll('main')).toHaveLength(1)
    expect(wrapper.findComponent(BaseCard).classes()).toContain('max-w-[440px]')
  })

  it('oferece campos rotulados, preenchimento automático e recuperação indisponível', async () => {
    const { wrapper } = await application()
    expect(wrapper.get('label[for="login-cpf"]').text()).toBe('CPF')
    expect(wrapper.get('#login-cpf').attributes()).toMatchObject({ placeholder: 'Digite seu CPF', inputmode: 'numeric', autocomplete: 'username', type: 'text' })
    expect(wrapper.get('label[for="login-password"]').text()).toBe('Senha')
    expect(wrapper.get('#login-password').attributes()).toMatchObject({ placeholder: 'Digite sua senha', autocomplete: 'current-password', type: 'password' })
    expect(wrapper.get('button[type="submit"]').text()).toBe('Entrar')
    expect(wrapper.get('button[disabled]').text()).toBe('Esqueci minha senha')
    expect(wrapper.get('#recovery-unavailable').text()).toBe('Em breve')
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('permite digitar e alternar a senha sem perder os valores', async () => {
    const { wrapper } = await application()
    await wrapper.get('#login-cpf').setValue('123.456.789-00')
    await wrapper.get('#login-password').setValue('minha senha')
    const toggle = wrapper.get('button[aria-controls="login-password"]')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-pressed')).toBe('true')
    expect(toggle.text()).toBe('Ocultar senha')
    expect(wrapper.get('#login-password').attributes('type')).toBe('text')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-pressed')).toBe('false')
    expect(wrapper.get('#login-password').attributes('type')).toBe('password')
    expect((wrapper.get('#login-password').element as HTMLInputElement).value).toBe('minha senha')
    expect((wrapper.get('#login-cpf').element as HTMLInputElement).value).toBe('123.456.789-00')
  })

  it('impede o envio nativo e não persiste credenciais ou redireciona com campos inválidos', async () => {
    const { wrapper, router } = await application()
    const localBefore = { ...localStorage }
    const sessionBefore = { ...sessionStorage }
    await wrapper.get('#login-cpf').setValue('123')
    await wrapper.get('#login-password').setValue('senha')
    const event = new Event('submit', { bubbles: true, cancelable: true })
    wrapper.get('form').element.dispatchEvent(event)
    await flushPromises()
    expect(event.defaultPrevented).toBe(true)
    expect(router.currentRoute.value.path).toBe('/login')
    expect(wrapper.get('#login-cpf-error').text()).toBe('O CPF deve conter 11 dígitos.')
    expect({ ...localStorage }).toEqual(localBefore)
    expect({ ...sessionStorage }).toEqual(sessionBefore)
  })

  it('valida no blur e atualiza os erros somente após interação relevante', async () => {
    const { wrapper } = await application()
    const cpf = wrapper.get('#login-cpf')
    const password = wrapper.get('#login-password')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    await cpf.setValue('123')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    await cpf.trigger('blur')
    expect(wrapper.get('#login-cpf-error').text()).toBe('O CPF deve conter 11 dígitos.')
    expect(cpf.attributes('aria-invalid')).toBe('true')
    expect(cpf.attributes('aria-describedby')).toBe('login-cpf-error')
    await cpf.setValue('11111111111')
    expect(wrapper.get('#login-cpf-error').text()).toBe('Informe um CPF válido.')
    await cpf.setValue('52998224725')
    expect(wrapper.find('#login-cpf-error').exists()).toBe(false)
    expect(cpf.attributes('aria-invalid')).toBeUndefined()
    await password.trigger('blur')
    expect(wrapper.get('#login-password-error').text()).toBe('Informe sua senha.')
    await password.setValue('x')
    expect(wrapper.find('#login-password-error').exists()).toBe(false)
  })

  it('valida obrigatórios no envio e foca o primeiro campo inválido', async () => {
    const { wrapper } = await application()
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('#login-cpf-error').text()).toBe('Informe seu CPF.')
    expect(wrapper.get('#login-password-error').text()).toBe('Informe sua senha.')
    expect(document.activeElement).toBe(wrapper.get('#login-cpf').element)
    await wrapper.get('#login-cpf').setValue('52998224725')
    await wrapper.get('form').trigger('submit')
    expect(document.activeElement).toBe(wrapper.get('#login-password').element)
  })

  it('formata colagem, filtra letras e limita o conteúdo a onze dígitos', async () => {
    const { wrapper } = await application()
    const input = wrapper.get('#login-cpf')
    for (const value of ['52998224725', '529.982.247-25', 'abc529982247259999']) {
      await input.setValue(value)
      expect((input.element as HTMLInputElement).value).toBe('529.982.247-25')
    }
    await input.setValue('')
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it('preserva o cursor na substituição e permite apagar junto à pontuação', async () => {
    const { wrapper } = await application()
    const field = wrapper.get('#login-cpf')
    const input = field.element as HTMLInputElement
    await field.setValue('52998224725')
    input.value = '529.182.247-25'
    input.setSelectionRange(5, 5)
    await field.trigger('input')
    expect(input.value).toBe('529.182.247-25')
    expect(input.selectionStart).toBe(5)
    input.setSelectionRange(4, 4)
    input.dispatchEvent(new InputEvent('beforeinput', { inputType: 'deleteContentBackward', bubbles: true, cancelable: true }))
    await flushPromises()
    expect(input.value).toBe('521.822.472-5')
    expect(input.selectionStart).toBe(2)
    await field.setValue('52998224725')
    input.setSelectionRange(3, 3)
    input.dispatchEvent(new InputEvent('beforeinput', { inputType: 'deleteContentForward', bubbles: true, cancelable: true }))
    await flushPromises()
    expect(input.value).toBe('529.822.472-5')
    expect(input.selectionStart).toBe(3)
  })

  it.each(['/', '/reservas', '/motorista/reservas'])('mantém o layout existente ao sair do login com sessão autorizada para %s', async path => {
    const { wrapper, router } = await application()
    await setMockSession(path.startsWith('/motorista') ? 'driver' : 'student')
    await router.push(path)
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(path)
    expect(wrapper.findComponent(PortalLayout).exists()).toBe(true)
    expect(wrapper.find('nav').exists()).toBe(true)
    expect(wrapper.find('#login-cpf').exists()).toBe(false)
  })
})
