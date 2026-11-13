import type { App } from 'vue'
import type { Pinia } from 'pinia'
import { isNavigationFailure } from 'vue-router'
import type { Router } from 'vue-router'
import { startSessionSync, useSessionStore } from './session'
import { hasRouteAccess } from './route-access'

export async function mountAfterNavigation(app: App, router: Router): Promise<void> {
  try {
    await router.isReady()
    app.mount('#app')
  } catch (error) {
    // Um redirecionamento entre aplicações aborta a navegação inicial local.
    if (!isNavigationFailure(error)) throw error
  }
}

export function syncSessionAccess(pinia: Pinia, router: Router): () => void {
  const session = useSessionStore(pinia)
  return startSessionSync(pinia, () => {
    const route = router.currentRoute.value
    if (route.matched.length && (!hasRouteAccess(route.meta, session.user)
      || (route.meta.guestOnly && session.authenticated))) {
      void router.replace({ path: route.path, query: route.query, hash: route.hash, force: true })
    }
  })
}
