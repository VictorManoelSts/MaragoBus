import { AuthError } from './contracts'
import type { AuthCredentials, AuthService, SessionUser } from './contracts'
import { clearDriverDemoSession, driverDemoEnabled, getDriverDemoSession, setDriverDemoSession } from './driver-demo'

// Dados sintéticos de desenvolvimento. Não representam pessoas ou contas reais.
const users = [
  { id: 'mock-student-test', name: 'Aluno de Teste', role: 'student', cpf: '90000000175', password: 'AlunoTeste!53' },
  { id: 'mock-driver-test', name: 'Motorista de Teste', role: 'driver', cpf: '90000000256', password: 'MotoristaTeste!53' },
  { id: 'mock-admin-test', name: 'Administrador de Teste', role: 'admin', cpf: '90000000337', password: 'AdminTeste!53' },
] as const

const demoDrivers = [
  { id: 'driver-demo-1', name: 'Motorista Demo 1', role: 'driver', cpf: '90000000418', password: 'MotoristaDemo!24' },
  { id: 'driver-demo-2', name: 'Motorista Demo 2', role: 'driver', cpf: '90000000507', password: 'MotoristaDemo!24' },
  { id: 'driver-demo-3', name: 'Motorista Demo 3', role: 'driver', cpf: '90000000680', password: 'MotoristaDemo!24' },
] as const

const cookieName = 'maragobus_mock_session'
function enabled() {
  return import.meta.env.DEV && !import.meta.env.PROD && window.location.hostname === 'localhost'
}
function publicUser(user: SessionUser): SessionUser {
  return { id: user.id, name: user.name, role: user.role }
}

export function listMockDrivers(): SessionUser[] {
  if (!enabled()) return []
  const drivers = driverDemoEnabled() ? demoDrivers : users.filter(user => user.role === 'driver')
  return drivers.map(publicUser)
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
    const matches = (item: AuthCredentials) => item.cpf === cpf && item.password === credentials.password
    const demo = driverDemoEnabled() ? demoDrivers.find(matches) : undefined
    if (demo) {
      setDriverDemoSession(demo.id)
      return publicUser(demo)
    }
    const user = users.find(matches)
    if (!user) throw new AuthError()
    clearDriverDemoSession()
    document.cookie = `${cookieName}=${user.id}; Path=/; SameSite=Lax`
    return publicUser(user)
  },
  async restore() {
    if (!enabled()) return null
    const demoId = getDriverDemoSession()
    const demo = demoDrivers.find(item => item.id === demoId)
    if (demo) return publicUser(demo)
    const id = document.cookie.split('; ').find(item => item.startsWith(cookieName + '='))?.slice(cookieName.length + 1)
    const user = users.find(item => item.id === id)
    if (id && !user) clearCookie()
    return user ? publicUser(user) : null
  },
  logout() {
    if (enabled() && !clearDriverDemoSession()) clearCookie()
  },
}
