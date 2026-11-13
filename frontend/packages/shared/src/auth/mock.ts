import { AuthError } from './contracts'
import type { AuthCredentials, AuthService, SessionUser } from './contracts'

// Dados sintéticos de desenvolvimento. Não representam pessoas ou contas reais.
const users = [
  { id: 'mock-student-test', name: 'Aluno de Teste', role: 'student', cpf: '90000000175', password: 'AlunoTeste!53' },
  { id: 'mock-driver-test', name: 'Motorista de Teste', role: 'driver', cpf: '90000000256', password: 'MotoristaTeste!53' },
  { id: 'mock-admin-test', name: 'Administrador de Teste', role: 'admin', cpf: '90000000337', password: 'AdminTeste!53' },
] as const

const cookieName = 'maragobus_mock_session'
function enabled() {
  return import.meta.env.DEV && !import.meta.env.PROD && window.location.hostname === 'localhost'
}
function publicUser(user: typeof users[number]): SessionUser {
  return { id: user.id, name: user.name, role: user.role }
}
function clearCookie() {
  document.cookie = `${cookieName}=; Path=/; SameSite=Lax; Max-Age=0`
}

export const mockAuthService: AuthService = {
  async login(credentials: AuthCredentials) {
    if (!enabled()) throw new AuthError('Autenticação indisponível neste ambiente.')
    // Operação assíncrona para exercitar o estado de envio; não representa latência de API.
    await new Promise(resolve => setTimeout(resolve, 250))
    const cpf = credentials.cpf.replace(/\D/g, '')
    const user = users.find(item => item.cpf === cpf && item.password === credentials.password)
    if (!user) throw new AuthError()
    document.cookie = `${cookieName}=${user.id}; Path=/; SameSite=Lax`
    return publicUser(user)
  },
  async restore() {
    if (!enabled()) return null
    const id = document.cookie.split('; ').find(item => item.startsWith(cookieName + '='))?.slice(cookieName.length + 1)
    const user = users.find(item => item.id === id)
    if (id && !user) clearCookie()
    return user ? publicUser(user) : null
  },
  logout() {
    if (enabled()) clearCookie()
  },
}
