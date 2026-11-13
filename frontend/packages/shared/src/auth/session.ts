import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Pinia } from 'pinia'
import { authService, mockAuthAvailable } from './service'
import type { AuthCredentials, SessionUser } from './contracts'
import { isSessionUser } from './contracts'

export const useSessionStore = defineStore('session', () => {
  const user = ref<SessionUser | null>(null)
  const authenticated = computed(() => isSessionUser(user.value))
  const pending = ref(false)
  const ready = ref(false)
  // Impede que uma restauração assíncrona antiga reverta login/logout mais recentes.
  let revision = 0
  let restoration: Promise<void> | null = null
  let loginTask: Promise<SessionUser> | null = null

  async function restore() {
    if (loginTask) await loginTask.catch(() => {})
    if (!restoration) {
      const current = revision
      restoration = (async () => {
        try {
          const restored = await authService.restore()
          if (current !== revision || pending.value) return
          if (restored !== null && !isSessionUser(restored)) {
            authService.logout()
            user.value = null
          } else user.value = restored
        } catch {
          if (current === revision) {
            authService.logout()
            user.value = null
          }
        } finally {
          if (current === revision && !pending.value) ready.value = true
        }
      })().finally(() => { restoration = null })
    }
    await restoration
    if (!ready.value || pending.value) await restore()
  }
  async function login(credentials: AuthCredentials) {
    if (pending.value) return null
    pending.value = true
    const current = ++revision
    try {
      loginTask = authService.login(credentials)
      const result = await loginTask
      if (current !== revision) {
        authService.logout()
        return null
      }
      user.value = result
      ready.value = true
      return result
    } finally {
      pending.value = false
      loginTask = null
    }
  }
  function logout() {
    revision++
    authService.logout()
    user.value = null
    ready.value = true
  }
  return { user, authenticated, pending, ready, restore, login, logout }
})

export function startSessionSync(pinia: Pinia, onChange?: () => void): () => void {
  const session = useSessionStore(pinia)
  const restore = async () => {
    const before = session.user && `${session.user.id}:${session.user.role}`
    await session.restore()
    const after = session.user && `${session.user.id}:${session.user.role}`
    if (before !== after) onChange?.()
  }
  restore()
  if (!mockAuthAvailable) return () => {}
  window.addEventListener('focus', restore)
  document.addEventListener('visibilitychange', restore)
  const timer = window.setInterval(restore, 1000)
  return () => {
    window.clearInterval(timer)
    window.removeEventListener('focus', restore)
    document.removeEventListener('visibilitychange', restore)
  }
}
