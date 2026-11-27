import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { themeBootstrapScript } from '../src/theme/bootstrap'
import { startTheme, useTheme, type ThemePreference } from '../src/theme'

const key = 'maragobus.theme'
const root = document.documentElement
const { preference, setPreference } = useTheme()
let stop: (() => void) | undefined

beforeEach(() => localStorage.removeItem(key))

afterEach(() => {
  stop?.()
  stop = undefined
  vi.restoreAllMocks()
  localStorage.removeItem(key)
  delete root.dataset.theme
})

function expectTheme(theme: ThemePreference) {
  expect(preference.value).toBe(theme)
  expect(root.dataset.theme).toBe(theme)
}

function emitStorage(changedKey: string | null, storageArea: Storage = localStorage) {
  window.dispatchEvent(new StorageEvent('storage', { key: changedKey, storageArea }))
}

describe('Preferência de tema', () => {
  it.each(['light', 'dark'] as const)('restaura %s após reiniciar', value => {
    stop = startTheme()
    setPreference(value)
    expect(localStorage.getItem(key)).toBe(value)
    stop()
    stop = startTheme()
    expectTheme(value)
  })

  it.each([null, 'system', 'invalid'])('usa Claro para a preferência armazenada %s', value => {
    if (value !== null) localStorage.setItem(key, value)
    stop = startTheme()
    expectTheme('light')
    setPreference('dark')
    setPreference('invalid')
    expectTheme('light')
    expect(localStorage.getItem(key)).toBe('light')
  })

  it('funciona quando o acesso a localStorage lança uma exceção', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError')
    })
    stop = startTheme()
    expectTheme('light')
    setPreference('dark')
    expectTheme('dark')
  })

  it('funciona quando a leitura e a gravação falham', () => {
    const denied = () => { throw new DOMException('Storage blocked', 'SecurityError') }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(denied)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(denied)
    stop = startTheme()
    expectTheme('light')
    setPreference('dark')
    expectTheme('dark')
  })

  it('sincroniza alterações, remoção e limpeza sem regravar em outra aba', () => {
    stop = startTheme()
    const write = vi.spyOn(Storage.prototype, 'setItem')
    localStorage.setItem(key, 'dark')
    emitStorage('outro')
    emitStorage(key, sessionStorage)
    expectTheme('light')
    write.mockClear()
    emitStorage(key)
    expectTheme('dark')
    expect(write).not.toHaveBeenCalled()
    localStorage.setItem(key, 'system')
    emitStorage(key)
    expectTheme('light')
    localStorage.setItem(key, 'dark')
    emitStorage(key)
    localStorage.removeItem(key)
    emitStorage(key)
    expectTheme('light')
    localStorage.setItem(key, 'dark')
    emitStorage(key)
    localStorage.clear()
    emitStorage(null)
    expectTheme('light')
  })

  it('remove o listener de armazenamento ao reinicializar e ao encerrar', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const previousStop = startTheme()
    stop = startTheme()
    previousStop()
    expect(remove.mock.calls.filter(([event]) => event === 'storage')).toHaveLength(1)
    localStorage.setItem(key, 'dark')
    emitStorage(key)
    expectTheme('dark')
    stop()
    expect(remove.mock.calls.filter(([event]) => event === 'storage')).toHaveLength(2)
    localStorage.setItem(key, 'light')
    emitStorage(key)
    expectTheme('dark')
  })
})

describe('Inicialização antecipada', () => {
  it.each([
    ['light', 'light'],
    ['dark', 'dark'],
    ['system', 'light'],
    ['invalid', 'light'],
    [null, 'light'],
  ] as const)('aplica %s como %s no head, antes da aplicação', (stored, expected) => {
    if (stored !== null) localStorage.setItem(key, stored)
    const media = vi.fn(() => ({ matches: true }))
    const browser = { document, localStorage, matchMedia: media }
    new Function('window', themeBootstrapScript())(browser)
    expect(root.dataset.theme).toBe(expected)
    expect(media).not.toHaveBeenCalled()
    stop = startTheme()
    expectTheme(expected)
  })
})
