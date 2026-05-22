import { authService, formatarEmail } from '@/services/authService'

const mockSignInWithEmailAndPassword = jest.fn()
const mockSignOut = jest.fn()
const mockGetIdTokenResult = jest.fn()
const mockGetDoc = jest.fn()
const mockDoc = jest.fn()

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  getIdTokenResult: (...args: unknown[]) => mockGetIdTokenResult(...args),
}))

jest.mock('@/lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
}))

jest.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
}))

import { auth } from '@/lib/firebase'

const authMock = auth as { currentUser: unknown }

function makeUser(uid: string) {
  return {
    uid,
    getIdToken: jest.fn().mockResolvedValue('token'),
  }
}

function makeTokenResult(perfil?: string) {
  return { claims: perfil ? { perfil } : {} }
}

describe('formatarEmail', () => {
  it('converte CPF limpo para email', () => {
    expect(formatarEmail('12345678901')).toBe('12345678901@maragobus.app')
  })

  it('remove pontuação do CPF formatado', () => {
    expect(formatarEmail('123.456.789-01')).toBe('12345678901@maragobus.app')
  })

  it('remove espaços do CPF', () => {
    expect(formatarEmail(' 123 456 789 01 ')).toBe('12345678901@maragobus.app')
  })
})

describe('login', () => {
  afterEach(() => {
    jest.clearAllMocks()
    authMock.currentUser = null
  })

  it('chama signInWithEmailAndPassword com o email formatado', async () => {
    const user = makeUser('uid-1')
    mockSignInWithEmailAndPassword.mockResolvedValue({ user })
    authMock.currentUser = user
    mockGetIdTokenResult.mockResolvedValue(makeTokenResult('aluno'))
    mockDoc.mockReturnValue('docRef')
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ primeiroAcesso: false }) })

    await authService.login('12345678901', 'senha123')

    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      auth,
      '12345678901@maragobus.app',
      'senha123'
    )
  })

  it('retorna primeiroAcesso: true quando Firestore retorna true', async () => {
    const user = makeUser('uid-2')
    mockSignInWithEmailAndPassword.mockResolvedValue({ user })
    authMock.currentUser = user
    mockGetIdTokenResult.mockResolvedValue(makeTokenResult('aluno'))
    mockDoc.mockReturnValue('docRef')
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ primeiroAcesso: true }) })

    const result = await authService.login('12345678901', 'senha123')

    expect(result).toEqual({ uid: 'uid-2', perfil: 'aluno', primeiroAcesso: true })
  })

  it('retorna primeiroAcesso: false quando Firestore retorna false', async () => {
    const user = makeUser('uid-3')
    mockSignInWithEmailAndPassword.mockResolvedValue({ user })
    authMock.currentUser = user
    mockGetIdTokenResult.mockResolvedValue(makeTokenResult('aluno'))
    mockDoc.mockReturnValue('docRef')
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ primeiroAcesso: false }) })

    const result = await authService.login('12345678901', 'senha123')

    expect(result.primeiroAcesso).toBe(false)
  })

  it('admin retorna primeiroAcesso: false sem consultar Firestore', async () => {
    const user = makeUser('uid-admin')
    mockSignInWithEmailAndPassword.mockResolvedValue({ user })
    authMock.currentUser = user
    mockGetIdTokenResult.mockResolvedValue(makeTokenResult('admin'))

    const result = await authService.login('12345678901', 'senha123')

    expect(result.primeiroAcesso).toBe(false)
    expect(mockGetDoc).not.toHaveBeenCalled()
  })

  it('usa coleção motoristas para perfil motorista', async () => {
    const user = makeUser('uid-mot')
    mockSignInWithEmailAndPassword.mockResolvedValue({ user })
    authMock.currentUser = user
    mockGetIdTokenResult.mockResolvedValue(makeTokenResult('motorista'))
    mockDoc.mockReturnValue('docRef')
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ primeiroAcesso: false }) })

    await authService.login('12345678901', 'senha123')

    expect(mockDoc).toHaveBeenCalledWith({}, 'motoristas', 'uid-mot')
  })

  it('rejeita com "Senha incorreta." para auth/wrong-password', async () => {
    const error = Object.assign(new Error(), { code: 'auth/wrong-password' })
    mockSignInWithEmailAndPassword.mockRejectedValue(error)

    await expect(authService.login('12345678901', 'errada')).rejects.toMatchObject({
      message: 'Senha incorreta.',
    })
  })

  it('rejeita com "Senha incorreta." para auth/invalid-credential', async () => {
    const error = Object.assign(new Error(), { code: 'auth/invalid-credential' })
    mockSignInWithEmailAndPassword.mockRejectedValue(error)

    await expect(authService.login('12345678901', 'errada')).rejects.toMatchObject({
      message: 'Senha incorreta.',
    })
  })

  it('rejeita com "CPF não cadastrado." para auth/user-not-found', async () => {
    const error = Object.assign(new Error(), { code: 'auth/user-not-found' })
    mockSignInWithEmailAndPassword.mockRejectedValue(error)

    await expect(authService.login('00000000000', 'senha')).rejects.toMatchObject({
      message: 'CPF não cadastrado.',
    })
  })

  it('rejeita com "Muitas tentativas." para auth/too-many-requests', async () => {
    const error = Object.assign(new Error(), { code: 'auth/too-many-requests' })
    mockSignInWithEmailAndPassword.mockRejectedValue(error)

    await expect(authService.login('12345678901', 'senha')).rejects.toMatchObject({
      message: 'Muitas tentativas. Tente novamente mais tarde.',
    })
  })

  it('rejeita com "Perfil não autorizado." se claim perfil for inválida', async () => {
    const user = makeUser('uid-x')
    mockSignInWithEmailAndPassword.mockResolvedValue({ user })
    authMock.currentUser = user
    mockGetIdTokenResult.mockResolvedValue(makeTokenResult('hacker'))

    await expect(authService.login('12345678901', 'senha')).rejects.toMatchObject({
      message: 'Perfil não autorizado.',
    })
  })
})

describe('logout', () => {
  it('chama signOut(auth)', async () => {
    mockSignOut.mockResolvedValue(undefined)
    await authService.logout()
    expect(mockSignOut).toHaveBeenCalledWith(auth)
  })
})

describe('getPerfil', () => {
  afterEach(() => {
    jest.clearAllMocks()
    authMock.currentUser = null
  })

  it('retorna null quando currentUser é null', async () => {
    authMock.currentUser = null
    const result = await authService.getPerfil()
    expect(result).toBeNull()
  })

  it('retorna "aluno" quando claim perfil é aluno', async () => {
    const user = makeUser('uid-aluno')
    authMock.currentUser = user
    mockGetIdTokenResult.mockResolvedValue(makeTokenResult('aluno'))

    const result = await authService.getPerfil()
    expect(result).toBe('aluno')
  })

  it('retorna null quando claim não contém perfil', async () => {
    const user = makeUser('uid-sem')
    authMock.currentUser = user
    mockGetIdTokenResult.mockResolvedValue(makeTokenResult())

    const result = await authService.getPerfil()
    expect(result).toBeNull()
  })
})
