import { ref } from 'vue'

const enabled = ref<boolean>()
const preference = 'maragobus:driver-demo'
const sessionKey = 'maragobus:driver-demo-session'

function localDevelopment() {
  return import.meta.env.DEV && !import.meta.env.PROD && window.location.hostname === 'localhost'
}

export function applyDriverDemoPreference(
  path = window.location.pathname,
  query: unknown = new URLSearchParams(window.location.search).get('demo-motorista'),
): boolean {
  if (!localDevelopment()) return false
  const selection = path === '/demo-motorista' ? '1' : query
  if (selection !== '0' && selection !== '1') return false

  const active = selection === '1'
  const changed = driverDemoEnabled() !== active
  if (active) sessionStorage.setItem(preference, '1')
  else {
    sessionStorage.removeItem(preference)
    sessionStorage.removeItem(sessionKey)
  }
  enabled.value = active
  return changed
}

export function driverDemoEnabled() {
  return localDevelopment() && (enabled.value ?? sessionStorage.getItem(preference) === '1')
}

export function getDriverDemoSession() {
  return driverDemoEnabled() ? sessionStorage.getItem(sessionKey) : null
}

export function setDriverDemoSession(id: string) {
  sessionStorage.setItem(sessionKey, id)
}

export function clearDriverDemoSession() {
  if (!getDriverDemoSession()) return false
  sessionStorage.removeItem(sessionKey)
  return true
}
