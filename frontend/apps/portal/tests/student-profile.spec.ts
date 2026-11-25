import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { useSessionStore } from '@maragobus/shared/auth/session'
import App from '../src/App.vue'
import { createPortalRouter } from '../src/router'
import { useReservationsStore } from '../src/stores/reservations'
import { useStudentProfileStore } from '../src/stores/student-profile'
import { setMockSession } from '../../../packages/shared/tests/auth-fixture'

async function page() {
  const router = createPortalRouter(createMemoryHistory())
  await router.push('/perfil')
  await router.isReady()
  return { router, wrapper: mount(App, { global: { plugins: [router] } }) }
}

describe('Perfil do aluno', () => {
  beforeEach(async () => {
    await setMockSession('student')
    vi.setSystemTime(new Date('2026-11-16T13:59:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('exibe somente dados disponíveis e mantém os campos cadastrais em leitura', async () => {
    const { wrapper } = await page()
    expect(wrapper.findAll('main dt').map(field => field.text())).toEqual([
      'Nome', 'CPF', 'E-mail', 'Faculdade', 'Curso', 'Ponto de embarque padrão',
    ])
    expect(wrapper.findAll('main dd').map(field => field.text())).toEqual([
      'Aluno de Teste', 'Não informado', 'Não informado', 'Faculdade de Demonstração', 'Não informado', 'Não informado',
    ])
    expect(wrapper.findAll('main input, main textarea')).toHaveLength(0)
    expect(wrapper.findAll('main select')).toHaveLength(1)
  })

  it('orienta ao salvar sem ponto e atualiza o perfil quando a seleção é válida', async () => {
    const { wrapper } = await page()
    const store = useStudentProfileStore()
    await wrapper.get('main form').trigger('submit')
    expect(wrapper.get('main [role="alert"]').text()).toContain('Selecione um ponto de embarque válido.')
    expect(store.saveDefaultPoint('ponto-inexistente')).toBe(false)
    await wrapper.get('main select').setValue('demo-north')
    await wrapper.get('main form').trigger('submit')
    expect(wrapper.get('main [role="status"]').text()).toContain('Ponto de embarque padrão atualizado.')
    expect(wrapper.findAll('main dd').at(-1)?.text()).toBe('Parada de exemplo — Bairro Norte')
    await useSessionStore().restore()
    expect(store.reservationContext.defaultBoardingPointId).toBe('demo-north')
  })

  it('usa a preferência nas novas reservas e preserva a escolha específica e a reserva confirmada', async () => {
    const { wrapper, router } = await page()
    await wrapper.get('main select').setValue('demo-north')
    await wrapper.get('main form').trigger('submit')
    await router.push('/reservar')
    await flushPromises()
    expect((wrapper.get('main select').element as HTMLSelectElement).value).toBe('demo-north')
    await wrapper.get('main select').setValue('demo-south')
    await wrapper.get('main button').trigger('click')
    const reservations = useReservationsStore()
    expect(reservations.studentReservations[0]?.boardingPointId).toBe('demo-south')
    expect(useStudentProfileStore().reservationContext.defaultBoardingPointId).toBe('demo-north')

    await router.push('/perfil')
    await flushPromises()
    await wrapper.get('main select').setValue('demo-center')
    await wrapper.get('main form').trigger('submit')
    vi.setSystemTime(new Date('2026-11-16T20:00:00Z'))
    await router.push('/reservar')
    await flushPromises()
    expect((wrapper.get('main select').element as HTMLSelectElement).value).toBe('demo-center')
    expect(reservations.studentReservations[0]?.boardingPoint).toBe('Parada de exemplo — Bairro Sul')
  })

  it('isola a preferência e os dados de demonstração ao trocar de aluno ou sair', async () => {
    const { wrapper } = await page()
    const store = useStudentProfileStore()
    await wrapper.get('main select').setValue('demo-north')
    await wrapper.get('main form').trigger('submit')
    const session = useSessionStore()
    session.user = { id: 'outro-aluno', name: 'Outro aluno', role: 'student' }
    await flushPromises()
    expect(wrapper.get('main dd').text()).toBe('Outro aluno')
    expect(wrapper.get('main').text()).not.toContain('Faculdade de Demonstração')
    expect((wrapper.get('main select').element as HTMLSelectElement).value).toBe('')
    expect(wrapper.find('main [role="status"]').exists()).toBe(false)
    expect(store.saveDefaultPoint('demo-center')).toBe(true)
    session.logout()
    expect(store.saveDefaultPoint('demo-north')).toBe(false)
    await setMockSession('student')
    expect(store.reservationContext.defaultBoardingPointId).toBeNull()
  })
})
