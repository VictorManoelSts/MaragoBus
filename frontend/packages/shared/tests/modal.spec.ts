import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { BaseModal } from '../src'

function host(initial = false) {
  return mount(defineComponent({
    components: { BaseModal },
    setup() { return { open: ref(initial) } },
    template: `<div>
      <button id="opener" @click="open = true">Abrir</button>
      <BaseModal v-model="open" title="Título acessível">
        <input aria-label="Campo de exemplo" />
        <template #footer><button id="last" @click="open = false">Concluir</button></template>
      </BaseModal>
    </div>`,
  }), { attachTo: document.body })
}
function getDialog() {
  return document.querySelector<HTMLDialogElement>('dialog')!
}
describe('BaseModal', () => {
  it('inicia fechado e abre via showModal com título e foco acessíveis', async () => {
    const wrapper = host()
    expect(getDialog().open).toBe(false)
    const opener = wrapper.get('#opener')
    ;(opener.element as HTMLButtonElement).focus()
    await opener.trigger('click')
    const dialog = getDialog()
    expect(dialog.open).toBe(true)
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Título acessível')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Fechar modal')
    expect(document.body.style.overflow).toBe('hidden')
    expect(dialog.querySelector('footer')?.textContent).toBe('Concluir')
  })
  it('fecha pelo botão e restaura foco e overflow anterior', async () => {
    document.body.style.overflow = 'scroll'
    const wrapper = host()
    const opener = wrapper.get<HTMLButtonElement>('#opener')
    opener.element.focus()
    await opener.trigger('click')
    getDialog().querySelector<HTMLButtonElement>('[data-modal-close]')!.click()
    await nextTick()
    expect(getDialog().open).toBe(false)
    expect(document.activeElement).toBe(opener.element)
    expect(document.body.style.overflow).toBe('scroll')
  })
  it('Escape solicita fechamento controlado e o pai atualiza v-model', async () => {
    const wrapper = host()
    await wrapper.get('#opener').trigger('click')
    const cancel = new Event('cancel', { cancelable: true })
    getDialog().dispatchEvent(cancel)
    await nextTick()
    expect(cancel.defaultPrevented).toBe(true)
    expect(getDialog().open).toBe(false)
    expect(wrapper.findComponent(BaseModal).emitted('update:modelValue')).toEqual([[false]])
  })
  it('mantém aberto até o pai aceitar o fechamento', async () => {
    const wrapper = mount(BaseModal, { props: { modelValue: true, title: 'Controlado' }, attachTo: document.body })
    getDialog().dispatchEvent(new Event('cancel', { cancelable: true }))
    await nextTick()
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    expect(getDialog().open).toBe(true)
    await wrapper.setProps({ modelValue: false })
    expect(getDialog().open).toBe(false)
  })
  it('contém Tab e Shift+Tab nas extremidades do conteúdo', async () => {
    host(true)
    const dialog = getDialog()
    const first = dialog.querySelector<HTMLButtonElement>('[data-modal-close]')!
    const last = dialog.querySelector<HTMLButtonElement>('#last')!
    last.focus()
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    last.dispatchEvent(tab)
    expect(tab.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(first)
    const back = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })
    first.dispatchEvent(back)
    expect(back.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(last)
    await nextTick()
  })
  it('ignora controles escondidos e desabilitados no ciclo de foco', () => {
    mount(BaseModal, {
      props: { modelValue: true, title: 'Foco' },
      slots: { default: '<input disabled /><div hidden><button>Oculto</button></div><button style="display:none">Invisível</button>' },
      attachTo: document.body,
    })
    const first = getDialog().querySelector<HTMLButtonElement>('[data-modal-close]')!
    first.focus()
    const back = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })
    first.dispatchEvent(back)
    expect(back.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(first)
  })
  it('sincroniza fechamento nativo, como um form method=dialog', async () => {
    const wrapper = host(true)
    getDialog().close()
    await nextTick()
    expect(wrapper.findComponent(BaseModal).props('modelValue')).toBe(false)
    expect(document.body.style.overflow).toBe('')
  })
  it('limpa modal, foco e bloqueio ao desmontar', () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const wrapper = host(true)
    const dialog = getDialog()
    wrapper.unmount()
    expect(dialog.open).toBe(false)
    expect(document.activeElement).toBe(opener)
    expect(document.body.style.overflow).toBe('')
  })
  it('preserva o bloqueio enquanto houver outro modal aberto', () => {
    const first = host(true)
    const second = host(true)
    first.unmount()
    expect(document.body.style.overflow).toBe('hidden')
    second.unmount()
    expect(document.body.style.overflow).toBe('')
  })
  it('não emite fechamento quando o pai fecha pela prop', async () => {
    const wrapper = mount(BaseModal, { props: { modelValue: true, title: 'Externo' }, attachTo: document.body })
    await wrapper.setProps({ modelValue: false })
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
  it('a camada modal é solicitada pela API nativa e não pelo atributo open', () => {
    const showModal = vi.mocked(HTMLDialogElement.prototype.showModal)
    const wrapper = host(true)
    expect(showModal).toHaveBeenCalled()
    expect(wrapper.findComponent(BaseModal).attributes('open')).toBeUndefined()
  })
})
