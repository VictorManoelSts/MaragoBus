import { readFileSync } from 'node:fs'
import { DOMWrapper, mount } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { startTheme } from '@maragobus/shared/theme'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'
import App from '../src/App.vue'
import { getMockReservationForm } from '../src/mocks/reservation-form'
import { createPortalRouter } from '../src/router'
import { useReservationsStore } from '../src/stores/reservations'

const sharedTokens = readFileSync('packages/shared/src/styles/tokens.css', 'utf8').split('@theme inline')[0]
const portalStyles = readFileSync('apps/portal/src/styles.css', 'utf8').replace(/^@(?:import|source) .*;$/gm, '')
const tones = ['success', 'danger', 'warning', 'info']
const suffixes = ['', '-surface', '-border']

afterEach(() => {
  vi.useRealTimers()
  delete document.documentElement.dataset.theme
  localStorage.removeItem('maragobus.theme')
})

it.each([
  { role: 'student', path: '/reservas' },
  { role: 'driver', path: '/motorista/reservas' },
] as const)('herda os tokens Claro e Escuro no diálogo teleportado de $role', async ({ role, path }) => {
  vi.setSystemTime(new Date('2026-11-16T13:00:00Z'))
  await setMockSession('student')
  expect(useReservationsStore().confirm({
    travelDate: '2026-11-16',
    context: getMockReservationForm('mock-student-test'),
    boardingPointId: 'demo-center',
    closures: [],
  }).status).toBe('confirmed')
  if (role === 'driver') await setMockSession('driver')

  const style = document.createElement('style')
  style.textContent = sharedTokens + portalStyles
  document.head.append(style)
  localStorage.setItem('maragobus.theme', 'light')
  const stopTheme = startTheme()
  try {
    const router = createPortalRouter(createMemoryHistory())
    await router.push(path)
    const wrapper = mount(App, { attachTo: document.body, global: { plugins: [router] } })
    if (role === 'driver') await wrapper.get('main summary').trigger('click')
    await wrapper.get('main li button').trigger('click')
    const dialog = new DOMWrapper(document.body).get('dialog[open]').element
    expect(dialog.parentElement).toBe(document.body)

    const tokens = (element: Element) => {
      const style = getComputedStyle(element)
      return tones.flatMap(tone => suffixes.map(suffix =>
        style.getPropertyValue(`--mb-${tone}${suffix}`).trim()))
    }
    const assertTokens = (expected: string[]) => {
      expect(tokens(dialog)).toEqual(expected)
      expect(tokens(wrapper.get('main').element)).toEqual(expected)
    }

    assertTokens([
      '#166534', '#ecfdf3', '#78aa89', '#991b1b', '#fef2f2', '#d69797',
      '#854d0e', '#fffbeb', '#c6a35e', '#303030', '#f3f3f3', '#767676',
    ])
    await wrapper.get('header button[role="switch"]').trigger('click')
    assertTokens([
      '#a6e3b5', '#183025', '#679d79', '#ffc1c1', '#3b2326', '#cb8088',
      '#f4d290', '#362a16', '#b28e52', '#bbdfec', '#1d303a', '#6e9cad',
    ])
  } finally {
    stopTheme()
    style.remove()
  }
})
