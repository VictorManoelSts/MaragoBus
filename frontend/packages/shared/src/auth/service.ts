import { AuthError } from './contracts'
import type { AuthService } from './contracts'
import { clearDriverDemoSession } from './driver-demo'

export const mockAuthAvailable = import.meta.env.DEV && !import.meta.env.PROD
  && typeof window !== 'undefined' && window.location.hostname === 'localhost'

// O import condicional é eliminado pelo Vite em produção, inclusive os dados de teste.
export const authService: AuthService = {
  async login(credentials) {
    if (!mockAuthAvailable) throw new AuthError('Autenticação indisponível neste ambiente.')
    return (await import('./mock')).mockAuthService.login(credentials)
  },
  async restore() {
    if (!mockAuthAvailable) return null
    return (await import('./mock')).mockAuthService.restore()
  },
  logout() {
    if (mockAuthAvailable && !clearDriverDemoSession()) {
      document.cookie = 'maragobus_mock_session=; Path=/; SameSite=Lax; Max-Age=0'
    }
  },
}
