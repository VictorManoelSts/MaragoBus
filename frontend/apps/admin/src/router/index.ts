import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw, RouterHistory } from 'vue-router'
import type { Pinia } from 'pinia'
import { createAccessGuard } from '@maragobus/shared/auth/route-access'
import { adminNavigationItems } from './admin-navigation'

declare module 'vue-router' {
  interface RouteMeta {
    adminTitle?: string
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    meta: { requiresAuth: true, allowedRoles: ['admin'] },
    component: () => import('../layouts/AdminShell.vue'),
    children: adminNavigationItems.map(item => ({
      path: item.path.slice(1),
      name: item.name,
      meta: { adminTitle: item.title ?? item.label },
      component: item.name === 'home'
        ? () => import('../pages/HomePage.vue')
        : item.name === 'colleges'
          ? () => import('../pages/CollegesPage.vue')
          : () => import('../pages/AdminPlaceholderPage.vue'),
      props: item.name === 'home' || item.name === 'colleges'
        ? false
        : { description: item.description, showLogout: item.name === 'profile' },
    })),
  },
]
if (import.meta.env.DEV) {
  routes.push({
    path: '/design-system',
    name: 'design-system',
    meta: { requiresAuth: false, adminTitle: 'Design System' },
    component: () => import('@maragobus/shared/demo'),
  })
}
routes.push({ path: '/:pathMatch(.*)*', redirect: { name: 'home' } })

export function createAdminRouter(history: RouterHistory = createWebHistory(import.meta.env.BASE_URL), pinia?: Pinia) {
  const router = createRouter({ history, routes })
  router.beforeEach(createAccessGuard('admin', pinia))
  router.afterEach((to, _from, failure) => {
    if (!failure && to.meta.adminTitle) document.title = `${to.meta.adminTitle} | MaragoBus Admin`
  })
  return router
}

export default createAdminRouter()
