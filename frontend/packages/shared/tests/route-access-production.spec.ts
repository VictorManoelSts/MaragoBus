import { afterEach, expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

it.each(['student', 'driver', 'admin'])('não aceita cookie mock de %s nas rotas de produção', async role => {
  vi.stubEnv('DEV', false)
  vi.stubEnv('PROD', true)
  vi.resetModules()
  const { createPortalRouter } = await import('../../../apps/portal/src/router')
  const { createAdminRouter } = await import('../../../apps/admin/src/router')
  const { authNavigation } = await import('../src/auth/navigation')
  const { useSessionStore } = await import('../src/auth/session')
  document.cookie = `maragobus_mock_session=mock-${role}-test; Path=/`
  const external = vi.spyOn(authNavigation, 'openExternal').mockImplementation(() => {})
  const pinia = createPinia()
  const portal = createPortalRouter(createMemoryHistory(), pinia)
  const admin = createAdminRouter(createMemoryHistory(), pinia)
  expect(portal.hasRoute('design-system')).toBe(false)
  expect(admin.hasRoute('design-system')).toBe(false)
  for (const path of ['/', '/reservas', '/motorista', '/motorista/reservas', '/design-system']) {
    await portal.push(path)
    expect(portal.currentRoute.value.name).toBe('login')
    expect(useSessionStore(pinia).authenticated).toBe(false)
  }
  await admin.push('/alunos')
  expect(admin.currentRoute.value.matched).toHaveLength(0)
  expect(external).toHaveBeenCalledExactlyOnceWith('http://localhost:5173/login')
})
