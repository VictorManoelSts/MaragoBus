import type { Pinia } from 'pinia'
import type { NavigationGuard, RouteMeta } from 'vue-router'
import type { AuthRole, SessionUser } from './contracts'
import { isSessionUser } from './contracts'
import { authNavigation, profileDestination } from './navigation'
import { useSessionStore } from './session'
import type { ApplicationId } from '../types'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    allowedRoles?: readonly AuthRole[]
    guestOnly?: boolean
  }
}

// Rotas sem declaração pública explícita são fechadas por padrão.
export function hasRouteAccess(meta: RouteMeta, user: SessionUser | null): boolean {
  return meta.requiresAuth === false
    || (isSessionUser(user) && meta.allowedRoles?.includes(user.role) === true)
}

export function createAccessGuard(application: ApplicationId, pinia?: Pinia): NavigationGuard {
  return async to => {
    if (to.meta.requiresAuth === false && !to.meta.guestOnly) return true
    const session = useSessionStore(pinia)
    await session.restore()

    function redirect(destination: { application: ApplicationId; path: string; origin: string }) {
      if (destination.application === application) return { path: destination.path, replace: true }
      authNavigation.openExternal(destination.origin + destination.path)
      return false
    }

    if (!session.authenticated) {
      if (to.meta.requiresAuth === false) return true
      return redirect({ application: 'portal', path: '/login', origin: 'http://localhost:5173' })
    }
    if (to.meta.guestOnly || !hasRouteAccess(to.meta, session.user)) {
      return redirect(profileDestination(session.user!.role))
    }
    return true
  }
}
