const preference = 'maragobus:driver-demo'
const sessionKey = 'maragobus:driver-demo-session'

function localDevelopment() {
  return import.meta.env.DEV && !import.meta.env.PROD && window.location.hostname === 'localhost'
}

export function applyDriverDemoPreference(path = window.location.pathname) {
  if (!localDevelopment()) return
  const selection = path === '/demo-motorista'
    ? '1' : new URLSearchParams(window.location.search).get('demo-motorista')
  if (selection === '1') sessionStorage.setItem(preference, '1')
  else if (selection === '0') {
    sessionStorage.removeItem(preference)
    sessionStorage.removeItem(sessionKey)
  }
}

export function driverDemoEnabled() {
  return localDevelopment() && sessionStorage.getItem(preference) === '1'
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
