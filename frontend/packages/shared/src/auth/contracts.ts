export type AuthRole = 'student' | 'driver' | 'admin'

export interface SessionUser {
  id: string
  name: string
  role: AuthRole
}

export interface AuthCredentials {
  cpf: string
  password: string
}

export interface AuthService {
  login(credentials: AuthCredentials): Promise<SessionUser>
  restore(): Promise<SessionUser | null>
  logout(): void
}

export function isSessionUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== 'object') return false
  const user = value as Partial<SessionUser>
  return typeof user.id === 'string' && user.id.trim().length > 0
    && typeof user.name === 'string' && user.name.trim().length > 0
    && (user.role === 'student' || user.role === 'driver' || user.role === 'admin')
}

export class AuthError extends Error {
  constructor(message = 'CPF ou senha incorretos.') {
    super(message)
    this.name = 'AuthError'
  }
}
