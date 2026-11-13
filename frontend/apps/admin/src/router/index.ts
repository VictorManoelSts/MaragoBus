import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw, RouterHistory } from 'vue-router'
import type { Pinia } from 'pinia'
import { createAccessGuard } from '@maragobus/shared/auth/route-access'
import { adminNavigationItems } from './admin-navigation'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    meta: { requiresAuth: true, allowedRoles: ['admin'] },
    component: () => import('../layouts/AdminShell.vue'),
    children: adminNavigationItems.map(item => ({
      path: item.path.slice(1),
      name: item.name,
      component: item.name === 'home'
        ? () => import('../pages/HomePage.vue')
        : () => import('../pages/AdminPlaceholderPage.vue'),
      props: item.name === 'home' ? false : { title: item.label, description: item.description, showLogout: item.name === 'profile' },
    })),
  },
]
if (import.meta.env.DEV) {
  routes.push({
    path: '/design-system',
    name: 'design-system',
    meta: { requiresAuth: false },
    component: () => import('@maragobus/shared/demo'),
  })
}
routes.push({ path: '/:pathMatch(.*)*', redirect: { name: 'home' } })

export function createAdminRouter(history: RouterHistory = createWebHistory(import.meta.env.BASE_URL), pinia?: Pinia) {
  const router = createRouter({ history, routes })
  router.beforeEach(createAccessGuard('admin', pinia))
  return router
}

export default createAdminRouter()
