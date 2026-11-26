import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw, RouterHistory } from 'vue-router'
import type { Pinia } from 'pinia'
import type { Component } from 'vue'
import { createAccessGuard } from '@maragobus/shared/auth/route-access'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { selectStudentDemo } from '@maragobus/shared/auth/student-demo'
import { resolveStudentDemoSelection } from '../mocks/student-demo'
import { applyDriverDemoPreference } from '@maragobus/shared/auth/driver-demo'
import { studentNavigationItems } from './student-navigation'
import { driverNavigationItems } from './driver-navigation'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
  }
}

const studentPages = {
  home: () => import('../pages/HomePage.vue'),
  'new-reservation': () => import('../pages/NewReservationPage.vue'),
  reservations: () => import('../pages/StudentReservationsPage.vue'),
  announcements: () => import('../pages/StudentNotificationsPage.vue'),
  profile: () => import('../pages/StudentProfilePage.vue'),
} satisfies Record<typeof studentNavigationItems[number]['name'], () => Promise<{ default: Component }>>

const driverPages = {
  'driver-reservations': () => import('../pages/DriverReservationsPage.vue'),
  'driver-warning-requests': () => import('../pages/DriverWarningRequestsPage.vue'),
  'driver-profile': () => import('../pages/DriverProfilePage.vue'),
} satisfies Record<typeof driverNavigationItems[number]['name'], () => Promise<{ default: Component }>>

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    meta: { requiresAuth: false, guestOnly: true, title: 'Entrar' },
    component: () => import('../pages/LoginPage.vue'),
  },
  {
    path: '/',
    meta: { requiresAuth: true, allowedRoles: ['student'] },
    component: () => import('../layouts/StudentLayout.vue'),
    children: studentNavigationItems.map(item => ({
      path: item.path.slice(1),
      name: item.name,
      meta: { title: item.label },
      component: studentPages[item.name],
    })),
  },
  { path: '/historico', name: 'history', redirect: { name: 'reservations' } },
  { path: '/avisos', redirect: { name: 'announcements' } },
  {
    path: '/motorista',
    meta: { requiresAuth: true, allowedRoles: ['driver'] },
    component: () => import('../layouts/DriverLayout.vue'),
    children: [
      { path: '', name: 'driver-home', redirect: { name: 'driver-reservations' } },
      { path: 'faculdades', name: 'driver-college-distribution', redirect: { name: 'driver-reservations' } },
      { path: 'passageiros', name: 'driver-passengers', redirect: { name: 'driver-reservations' } },
      { path: 'resumo', name: 'driver-summary', redirect: { name: 'driver-reservations' } },
      ...driverNavigationItems.map(item => ({
        path: item.path.slice('/motorista/'.length),
        name: item.name,
        meta: { title: item.title },
        component: driverPages[item.name],
      })),
    ],
  },
]
if (import.meta.env.DEV && !import.meta.env.PROD) {
  routes.push({
    path: '/demo-aluno',
    redirect: to => ({
      name: 'login',
      query: { 'demo-aluno': to.query.cenario === '0' ? '0' : resolveStudentDemoSelection(to.query.cenario) },
    }),
  })
  routes.push({
    path: '/demo-motorista',
    redirect: { name: 'login', query: { 'demo-motorista': '1' } },
  })
  routes.push({
    path: '/design-system',
    name: 'design-system',
    meta: { requiresAuth: false, title: 'Design System' },
    component: () => import('@maragobus/shared/demo'),
  })
}
routes.push({ path: '/:pathMatch(.*)*', redirect: { name: 'home' } })

export function createPortalRouter(history: RouterHistory = createWebHistory(import.meta.env.BASE_URL), pinia?: Pinia) {
  const router = createRouter({ history, routes })
  if (import.meta.env.DEV && !import.meta.env.PROD) {
    router.beforeEach(async to => {
      if (to.name !== 'login' || window.location.hostname !== 'localhost') return
      const student = to.query['demo-aluno']
      const driver = to.query['demo-motorista']
      if (typeof student === 'string') {
        selectStudentDemo(student === '0' ? null : resolveStudentDemoSelection(student))
      } else if (driver === '1') {
        selectStudentDemo(null)
      }
      if (typeof student === 'string' || driver === '1' || driver === '0') {
        applyDriverDemoPreference(to.path, driver ?? null)
        await useSessionStore(pinia).restore()
      }
    })
  }
  router.beforeEach(createAccessGuard('portal', pinia))
  router.afterEach((to, _from, failure) => {
    if (!failure && to.meta.title) document.title = `${to.meta.title} — MaragoBus`
  })
  return router
}

export default createPortalRouter()
