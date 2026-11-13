import { afterEach, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { enableAutoUnmount } from '@vue/test-utils'

enableAutoUnmount(afterEach)
beforeEach(() => {
  setActivePinia(createPinia())
  document.cookie = 'maragobus_mock_session=; Path=/; Max-Age=0'
})

// jsdom não implementa a top layer nativa. Estes dublês simulam apenas
// o ciclo open/close; o bloqueio nativo do fundo precisa de um navegador real.
Object.defineProperties(HTMLDialogElement.prototype, {
  showModal: {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) { this.open = true }),
  },
  close: {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.open = false
      this.dispatchEvent(new Event('close'))
    }),
  },
})
afterEach(() => {
  document.body.innerHTML = ''
  document.body.style.overflow = ''
})
