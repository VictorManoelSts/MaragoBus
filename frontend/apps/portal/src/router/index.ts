import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw, RouterHistory } from 'vue-router'
import type { Pinia } from 'pinia'
import { createAccessGuard } from '@maragobus/shared/auth/route-access'
import { studentNavigationItems } from './student-navigation'
import { driverNavigationItems } from './driver-navigation'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    meta: { requiresAuth: false, guestOnly: true },
    component: () => import('../pages/LoginPage.vue'),
  },
  {
    path: '/',
    meta: { requiresAuth: true, allowedRoles: ['student'] },
    component: () => import('../layouts/StudentLayout.vue'),
    children: studentNavigationItems.map(item => ({
      path: item.path.slice(1),
      name: item.name,
      component: item.name === 'home'
        ? () => import('../pages/HomePage.vue')
        : item.name === 'new-reservation'
          ? () => import('../pages/NewReservationPage.vue')
          : () => import('../pages/PortalPlaceholderPage.vue'),
      props: item.name === 'home' || item.name === 'new-reservation' ? false : { title: item.label, description: item.description, message: item.message, showLogout: item.name === 'profile' },
    })),
  },
  { path: '/historico', name: 'history', redirect: { name: 'reservations' } },
  { path: '/avisos', redirect: { name: 'announcements' } },
  {
    path: '/motorista',
    meta: { requiresAuth: true, allowedRoles: ['driver'] },
    component: () => import('../layouts/DriverLayout.vue'),
    children: [
      { path: '', redirect: { name: 'driver-reservations' } },
      { path: 'passageiros', name: 'driver-passengers', redirect: { name: 'driver-reservations' } },
      { path: 'resumo', name: 'driver-summary', redirect: { name: 'driver-reservations' } },
      ...driverNavigationItems.map(item => ({
        path: item.path.slice('/motorista/'.length),
        name: item.name,
        component: () => import('../pages/PortalPlaceholderPage.vue'),
        props: { title: item.title, description: item.description, showLogout: item.name === 'driver-profile' },
      })),
    ],
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

export function createPortalRouter(history: RouterHistory = createWebHistory(import.meta.env.BASE_URL), pinia?: Pinia) {
  const router = createRouter({ history, routes })
  router.beforeEach(createAccessGuard('portal', pinia))
  return router
}

export default createPortalRouter()
