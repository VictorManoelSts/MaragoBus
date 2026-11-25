import type { AuthRole } from './contracts'
import type { ApplicationId } from '../types'

export function profileDestination(role: AuthRole): { application: ApplicationId; path: string; origin: string } {
  if (role === 'admin') return { application: 'admin', path: '/', origin: 'http://localhost:5174' }
  return { application: 'portal', path: role === 'driver' ? '/motorista' : '/', origin: 'http://localhost:5173' }
}

export const authNavigation = {
  openExternal(url: string) { window.location.assign(url) },
  async afterLogin(role: AuthRole, router: { replace(path: string): Promise<unknown> }) {
    const destination = profileDestination(role)
    if (destination.application === 'admin') authNavigation.openExternal(destination.origin + destination.path)
    else await router.replace(destination.path)
  },
  async afterLogout(router: { replace(path: string): Promise<unknown> }) {
    if (window.location.origin === 'http://localhost:5173') await router.replace('/login')
    else authNavigation.openExternal('http://localhost:5173/login')
  },
}
