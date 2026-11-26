import { AuthError } from './contracts'
import type { AuthCredentials, AuthService, SessionUser } from './contracts'
import { clearDriverDemoSession, driverDemoEnabled, getDriverDemoSession, setDriverDemoSession } from './driver-demo'
import { clearStudentDemoSession, hasStudentDemoSession, setStudentDemoSession, studentDemoSelection } from './student-demo'
import { demoDrivers, testDriver } from './mock-drivers'

// Dados sintéticos de desenvolvimento. Não representam pessoas ou contas reais.
const users = [
  { id: 'mock-student-test', name: 'Aluno de Teste', role: 'student', cpf: '90000000175', password: 'AlunoTeste!53' },
  { ...testDriver, cpf: '90000000256', password: 'MotoristaTeste!53' },
  { id: 'mock-admin-test', name: 'Administrador de Teste', role: 'admin', cpf: '90000000337', password: 'AdminTeste!53' },
] as const

const demoAccounts = [
  { ...demoDrivers[0], cpf: '90000000418', password: 'MotoristaDemo!24' },
  { ...demoDrivers[1], cpf: '90000000507', password: 'MotoristaDemo!24' },
  { ...demoDrivers[2], cpf: '90000000680', password: 'MotoristaDemo!24' },
] as const

const cookieName = 'maragobus_mock_session'
function enabled() {
  return import.meta.env.DEV && !import.meta.env.PROD && window.location.hostname === 'localhost'
}
function publicUser(user: SessionUser): SessionUser {
  return { id: user.id, name: user.name, role: user.role }
}

function clearCookie() {
  document.cookie = `${cookieName}=; Path=/; SameSite=Lax; Max-Age=0`
}

export const mockAuthService: AuthService = {
  async login(credentials: AuthCredentials) {
    if (!enabled()) throw new AuthError('Autenticação indisponível neste ambiente.')
    const studentScenario = studentDemoSelection()
    // Operação assíncrona para exercitar o estado de envio; não representa latência de API.
    await new Promise(resolve => setTimeout(resolve, 250))
    const cpf = credentials.cpf.replace(/\D/g, '')
    const matches = (item: AuthCredentials) => item.cpf === cpf && item.password === credentials.password
    if (studentScenario !== studentDemoSelection()) throw new AuthError()
    if (studentScenario) {
      if (!matches(users[0])) throw new AuthError()
      setStudentDemoSession()
      return publicUser(users[0])
    }
    const demo = driverDemoEnabled() ? demoAccounts.find(matches) : undefined
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
    if (studentDemoSelection()) return hasStudentDemoSession() ? publicUser(users[0]) : null
    const demoId = getDriverDemoSession()
    const demo = demoAccounts.find(item => item.id === demoId)
    if (demo) return publicUser(demo)
    const id = document.cookie.split('; ').find(item => item.startsWith(cookieName + '='))?.slice(cookieName.length + 1)
    const user = users.find(item => item.id === id)
    if (id && !user) clearCookie()
    return user ? publicUser(user) : null
  },
  logout() {
    if (!enabled()) return
    if (studentDemoSelection()) clearStudentDemoSession()
    else if (!clearDriverDemoSession()) clearCookie()
  },
}
