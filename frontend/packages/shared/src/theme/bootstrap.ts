export type ThemePreference = 'light' | 'dark'

// Keep this function self-contained. Vite embeds it as a classic script in the head.
export function initializeThemeEnvironment(browser: Window) {
  const key = 'maragobus.theme'
  let storage: Storage | undefined
  try {
    storage = browser.localStorage
  } catch {
    // The current tab can still change its theme without storage access.
  }
  function normalize(value: unknown): ThemePreference {
    return value === 'dark' ? 'dark' : 'light'
  }

  function read(): ThemePreference {
    try {
      return normalize(storage?.getItem(key))
    } catch {
      return 'light'
    }
  }

  function apply(preference: ThemePreference) {
    browser.document.documentElement.dataset.theme = preference
  }

  const preference = read()
  apply(preference)
  return { key, storage, normalize, read, apply, preference }
}

export function themeBootstrapScript() {
  return `(${initializeThemeEnvironment.toString()})(window);`
}
