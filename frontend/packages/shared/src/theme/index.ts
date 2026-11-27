import { readonly, shallowRef } from 'vue'
import { initializeThemeEnvironment } from './bootstrap'
import type { ThemePreference } from './bootstrap'

export type { ThemePreference } from './bootstrap'

const preference = shallowRef<ThemePreference>('light')
let active: { set: (value: unknown) => void; stop: () => void } | undefined

export function startTheme(browser: Window = window) {
  active?.stop()
  const environment = initializeThemeEnvironment(browser)
  const { key, storage, normalize, read, apply } = environment
  preference.value = environment.preference

  function update(next: ThemePreference) {
    preference.value = next
    apply(next)
  }

  function sync(event: StorageEvent) {
    if (!storage || event.storageArea !== storage || (event.key !== key && event.key !== null)) return
    update(read())
  }

  function set(value: unknown) {
    const next = normalize(value)
    update(next)
    try {
      storage?.setItem(key, next)
    } catch {
      // Keep the preference active in this tab if persistence fails.
    }
  }

  const controller = {
    set,
    stop() {
      if (active !== controller) return
      browser.removeEventListener('storage', sync)
      active = undefined
    },
  }
  browser.addEventListener('storage', sync)
  active = controller
  return controller.stop
}

export function useTheme() {
  return {
    preference: readonly(preference),
    setPreference: (value: unknown) => active?.set(value),
  }
}

if (import.meta.hot) import.meta.hot.dispose(() => active?.stop())
