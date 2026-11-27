import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import App from '../src/App.vue'
import { createAdminRouter } from '../src/router'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'
import { createDemoCollegesService } from '../src/services/demo-colleges'
import { collegesServiceKey } from '../src/stores/colleges'

async function openPage(empty = false) {
  const pinia = createPinia()
  setActivePinia(pinia)
  await setMockSession('admin')
  const router = createAdminRouter(createMemoryHistory(), pinia)
  await router.push('/faculdades')
  const page = mount(App, {
    attachTo: document.body,
    global: {
      plugins: [pinia, router],
      provide: empty ? { [collegesServiceKey]: createDemoCollegesService([]).service } : {},
    },
  })
  return page
}

function field(label: string) {
  const element = [...document.querySelectorAll('label')].find(item => item.textContent === label)
  const control = element?.control
  if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) {
    throw new Error(`Campo ausente: ${label}`)
  }
  return control
}

async function fill(label: string, value: string) {
  const control = field(label)
  control.value = value
  control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
  await flushPromises()
}

async function click(label: string, scope: ParentNode = document) {
  const button = [...scope.querySelectorAll('button')].find(item => (item.getAttribute('aria-label') ?? item.textContent?.trim()) === label)
  if (!button) throw new Error(`Botão ausente: ${label}`)
  button.focus()
  button.click()
  await flushPromises()
  return button
}

function dialog() {
  const element = document.querySelector('dialog[open]')
  expect(element?.getAttribute('aria-labelledby')).toBeTruthy()
  return element!
}

function row(name: string) {
  const item = [...document.querySelectorAll('li')].find(element => element.querySelector('h2')?.textContent === name)
  expect(item).toBeDefined()
  return item!
}

describe('Gestão demonstrativa de faculdades', () => {
  it('carrega, pesquisa por sigla e nome e filtra a situação', async () => {
    const page = await openPage()
    expect(page.text()).toContain('Carregando faculdades')
    await flushPromises()
    expect(page.text()).toContain('Dados fictícios')
    await fill('Pesquisar por nome ou sigla', 'fhl')
    expect(row('Faculdade Horizonte Leste').textContent).toContain('Ativa')
    await fill('Situação', 'inactive')
    expect(page.text()).toContain('Nenhuma faculdade corresponde')
    await fill('Pesquisar por nome ou sigla', 'campo sereno')
    expect(row('Faculdade Campo Sereno').textContent).toContain('Inativa')
  })

  it('valida nome obrigatório, limite e duplicidade de inativa, e permite sigla opcional', async () => {
    const page = await openPage()
    await flushPromises()
    const opener = await click('Nova faculdade')
    expect(dialog().contains(document.activeElement)).toBe(true)
    await click('Salvar faculdade', dialog())
    const name = field('Nome')
    expect(name.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(name)
    await fill('Nome', 'a'.repeat(151))
    await click('Salvar faculdade', dialog())
    expect(dialog().textContent).toContain('150 caracteres')
    await fill('Nome', ' Faculdade Campo Sereno ')
    await click('Salvar faculdade', dialog())
    expect(dialog().textContent).toContain('Já existe uma faculdade com este nome')
    await fill('Nome', 'Faculdade Vale Azul')
    await click('Salvar faculdade', dialog())
    expect(page.text()).toContain('Faculdade cadastrada')
    expect(row('Faculdade Vale Azul').textContent).toContain('Ativa')
    expect(document.activeElement).toBe(opener)
  })

  it('edita a sigla sem considerar o próprio nome duplicado', async () => {
    await openPage()
    await flushPromises()
    const item = row('Faculdade Horizonte Leste')
    await click('Editar Faculdade Horizonte Leste', item)
    expect(field('Nome').value).toBe('Faculdade Horizonte Leste')
    await fill('Nome', 'Faculdade Campo Sereno')
    await click('Salvar alterações', dialog())
    expect(dialog().textContent).toContain('Já existe uma faculdade com este nome')
    await fill('Nome', 'Faculdade Horizonte Leste')
    await fill('Sigla (opcional)', 'FCS')
    await click('Salvar alterações', dialog())
    expect(row('Faculdade Horizonte Leste')).toBe(item)
    expect(item.textContent).toContain('FCS')
    await click('Editar Faculdade Horizonte Leste', item)
    await fill('Nome', 'Faculdade Horizonte Novo')
    await click('Salvar alterações', dialog())
    expect(row('Faculdade Horizonte Novo')).toBe(item)
  })

  it('contém o foco, permite cancelar e confirma desativação e reativação do mesmo registro', async () => {
    const page = await openPage()
    await flushPromises()
    const item = row('Faculdade Horizonte Leste')
    const opener = await click('Desativar Faculdade Horizonte Leste', item)
    const modal = dialog()
    modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true, bubbles: true }))
    expect(document.activeElement?.textContent?.trim()).toBe('Confirmar desativação')
    modal.dispatchEvent(new Event('cancel', { cancelable: true }))
    await flushPromises()
    expect(document.querySelector('dialog[open]')).toBeNull()
    expect(document.activeElement).toBe(opener)
    expect(item.textContent).toContain('Ativa')
    await click('Desativar Faculdade Horizonte Leste', item)
    await click('Confirmar desativação', dialog())
    expect(page.text()).toContain('Faculdade desativada')
    expect(item.textContent).toContain('Inativa')
    await click('Reativar Faculdade Horizonte Leste', item)
    await click('Confirmar reativação', dialog())
    expect(page.text()).toContain('Faculdade reativada')
    expect(row('Faculdade Horizonte Leste')).toBe(item)
    expect(item.textContent).toContain('Ativa')
  })

  it('exibe falha demonstrativa e recupera a lista ao tentar novamente', async () => {
    const page = await openPage()
    await flushPromises()
    await click('Simular erro de carregamento')
    expect(page.get('[role="alert"]').text()).toContain('Falha simulada')
    expect(document.activeElement?.textContent?.trim()).toBe('Tentar novamente')
    await click('Tentar novamente')
    expect(document.activeElement).toBe(field('Pesquisar por nome ou sigla'))
    expect(row('Faculdade Horizonte Leste').textContent).toContain('Ativa')
  })

  it('distingue a lista vazia de uma pesquisa sem resultados e permite o primeiro cadastro', async () => {
    const page = await openPage(true)
    await flushPromises()
    expect(page.text()).toContain('Nenhuma faculdade cadastrada')
    expect(page.text()).not.toContain('Nenhuma faculdade corresponde')
    await click('Nova faculdade')
    await fill('Nome', 'Faculdade Primeira')
    await click('Salvar faculdade', dialog())
    expect(row('Faculdade Primeira').textContent).toContain('Não informada')
  })

  it('leva o foco à pesquisa quando a alteração remove a linha do filtro atual', async () => {
    await openPage()
    await flushPromises()
    await fill('Situação', 'active')
    await click('Desativar Faculdade Horizonte Leste', row('Faculdade Horizonte Leste'))
    await click('Confirmar desativação', dialog())
    expect(document.activeElement).toBe(field('Pesquisar por nome ou sigla'))
  })
})
