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
  return { router, wrapper: mount(App, { attachTo: document.body, global: { plugins: [router] } }) }
}

describe('Perfil do aluno', () => {
  beforeEach(async () => {
    await setMockSession('student')
    vi.setSystemTime(new Date('2026-11-16T13:59:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('exibe somente dados disponíveis e mantém os campos cadastrais em leitura', async () => {
    const { wrapper } = await page()
    expect(wrapper.get('main > div').classes()).toContain('min-w-0')
    expect(wrapper.get('main > div').classes()).toContain('wrap-anywhere')
    expect(wrapper.findAll('main dt').map(field => field.text())).toEqual([
      'Nome completo', 'CPF', 'Faculdade', 'Curso', 'Modalidade de ensino',
    ])
    expect(wrapper.findAll('main dd').map(field => field.text())).toEqual([
      'Aluno de Teste', 'Não informado', 'Faculdade de Demonstração', 'Não informado', 'Não informado',
    ])
    expect(wrapper.findAll('main h2').map(heading => heading.text())).toEqual([
      'Dados pessoais', 'Dados acadêmicos', 'Segurança',
    ])
    expect(wrapper.findAll('main input, main textarea')).toHaveLength(2)
    expect(wrapper.findAll('main select')).toHaveLength(1)
    const [personal, , security] = wrapper.findAll('main .mb-card')
    expect(security?.text()).toContain('autenticação real')
    expect(security?.find('button').exists()).toBe(false)
    expect(personal?.findAll('select, button').map(control => control.element.tagName)).toEqual([
      'SELECT', 'BUTTON', 'BUTTON',
    ])
    expect(personal?.findAll('button').every(button => button.classes().includes('w-full'))).toBe(true)
    expect(wrapper.get('main [role="status"]').attributes('aria-live')).toBe('polite')
    expect(wrapper.get('main [role="status"]').attributes('aria-atomic')).toBe('true')
  })

  it('valida contatos, associa os erros aos campos e foca o primeiro inválido', async () => {
    const { wrapper } = await page()
    const store = useStudentProfileStore()
    const email = wrapper.get('main input[type="email"]')
    const phone = wrapper.get('main input[type="tel"]')
    await email.setValue('email inválido')
    await phone.setValue('1234')
    await wrapper.get('main select').setValue('demo-north')
    await wrapper.get('main form').trigger('submit')
    await flushPromises()
    expect(document.activeElement).toBe(email.element)
    for (const [field, label] of [[email, 'E-mail'], [phone, 'Telefone']] as const) {
      expect(wrapper.get('label[for="' + field.attributes('id') + '"]').text()).toBe(label)
      expect(field.attributes('aria-invalid')).toBe('true')
      expect(wrapper.get('#' + field.attributes('aria-describedby')).attributes('role')).toBe('alert')
    }
    expect(store.preferences).toEqual({ email: '', phone: '', boardingPointId: '' })
    expect(store.savePreferences({ email: 'aluno@example.com', phone: '', boardingPointId: 'ponto-inexistente' })).toBe(false)
    expect(store.saveDefaultPoint('ponto-inexistente')).toBe(false)
  })

  it('salva contatos e ponto válidos e descarta alterações posteriores', async () => {
    const { wrapper } = await page()
    const store = useStudentProfileStore()
    const email = wrapper.get('main input[type="email"]')
    const phone = wrapper.get('main input[type="tel"]')
    await email.setValue('aluno@example.com')
    await phone.setValue('(82) 91234-5678')
    await wrapper.get('main select').setValue('demo-north')
    wrapper.get<HTMLButtonElement>('main button[type="submit"]').element.focus()
    await wrapper.get('main form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('main [role="status"]').text()).toBe('Alterações salvas.')
    expect(document.activeElement).toBe(email.element)
    await useSessionStore().restore()
    expect(store.preferences).toEqual({
      email: 'aluno@example.com', phone: '(82) 91234-5678', boardingPointId: 'demo-north',
    })
    await email.setValue('rascunho')
    await phone.setValue('123')
    await wrapper.get('main select').setValue('demo-south')
    const discard = wrapper.get<HTMLButtonElement>('main form button[type="button"]')
    discard.element.focus()
    await discard.trigger('click')
    await flushPromises()
    expect((email.element as HTMLInputElement).value).toBe('aluno@example.com')
    expect((phone.element as HTMLInputElement).value).toBe('(82) 91234-5678')
    expect((wrapper.get('main select').element as HTMLSelectElement).value).toBe('demo-north')
    expect(wrapper.get('main [role="status"]').text()).toBe('Alterações descartadas.')
    expect(document.activeElement).toBe(email.element)
  })

  it('usa a preferência nas novas reservas e preserva a escolha específica e a reserva confirmada', async () => {
    const { wrapper, router } = await page()
    await wrapper.get('main select').setValue('demo-north')
    await wrapper.get('main form').trigger('submit')
    await router.push('/')
    await flushPromises()
    expect((wrapper.get('main select').element as HTMLSelectElement).value).toBe('demo-north')
    await wrapper.get('main select').setValue('demo-south')
    await wrapper.get('main form').trigger('submit')
    const reservations = useReservationsStore()
    expect(reservations.studentReservations[0]?.boardingPointId).toBe('demo-south')
    expect(useStudentProfileStore().reservationContext.defaultBoardingPointId).toBe('demo-north')

    await router.push('/perfil')
    await flushPromises()
    await wrapper.get('main select').setValue('demo-center')
    await wrapper.get('main form').trigger('submit')
    vi.setSystemTime(new Date('2026-11-16T20:00:00Z'))
    await router.push('/')
    await flushPromises()
    expect((wrapper.get('main select').element as HTMLSelectElement).value).toBe('demo-center')
    expect(reservations.studentReservations[0]?.boardingPoint).toBe('Parada de exemplo — Bairro Sul')
  })

  it('permite atualizar contatos mesmo sem um ponto padrão cadastrado', async () => {
    const { wrapper } = await page()
    const email = wrapper.get('main input[type="email"]')
    await email.setValue('aluno@example.com')
    await wrapper.get('main form').trigger('submit')
    expect(useStudentProfileStore().preferences).toEqual({
      email: 'aluno@example.com', phone: '', boardingPointId: '',
    })
    await email.setValue('')
    await wrapper.get('main form').trigger('submit')
    expect(useStudentProfileStore().preferences.email).toBe('')
  })

  it('isola a preferência e os dados de demonstração ao trocar de aluno ou sair', async () => {
    const { wrapper } = await page()
    const store = useStudentProfileStore()
    await wrapper.get('main input[type="email"]').setValue('aluno@example.com')
    await wrapper.get('main input[type="tel"]').setValue('82912345678')
    await wrapper.get('main select').setValue('demo-north')
    await wrapper.get('main form').trigger('submit')
    const session = useSessionStore()
    session.user = { id: 'outro-aluno', name: 'Outro aluno', role: 'student' }
    await flushPromises()
    expect(wrapper.get('main dd').text()).toBe('Outro aluno')
    expect(wrapper.get('main').text()).not.toContain('Faculdade de Demonstração')
    expect((wrapper.get('main select').element as HTMLSelectElement).value).toBe('')
    expect(wrapper.get('main [role="status"]').text()).toBe('')
    expect(store.preferences).toEqual({ email: '', phone: '', boardingPointId: '' })
    expect(store.saveDefaultPoint('demo-center')).toBe(true)
    session.logout()
    expect(store.saveDefaultPoint('demo-north')).toBe(false)
    expect(store.savePreferences({ email: 'outro@example.com', phone: '', boardingPointId: '' })).toBe(false)
    await setMockSession('student')
    expect(store.reservationContext.defaultBoardingPointId).toBeNull()
    expect(store.preferences.email).toBe('')
  })
})
