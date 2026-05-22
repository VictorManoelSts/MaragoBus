import { renderHook, act } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'

jest.mock('@/lib/firebase', () => ({
  auth: {},
  db: {},
}))

let capturedCallback: ((user: unknown) => Promise<void> | void) | null = null

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((_auth, cb) => {
    capturedCallback = cb
    return jest.fn()
  }),
  getIdTokenResult: jest.fn(),
}))

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db, _colecao, _uid) => `ref:${_colecao}/${_uid}`),
  getDoc: jest.fn(),
}))

import { getIdTokenResult } from 'firebase/auth'
import { getDoc } from 'firebase/firestore'

const mockGetIdTokenResult = getIdTokenResult as jest.Mock
const mockGetDoc = getDoc as jest.Mock

const mockAlunoUser = { uid: 'aluno123' }
const mockMotoristaUser = { uid: 'motorista123' }
const mockAdminUser = { uid: 'admin123' }

beforeEach(() => {
  jest.clearAllMocks()
  capturedCallback = null
})

describe('useAuth — estado inicial', () => {
  it('retorna loading=true antes do callback do Firebase', () => {
    const { result } = renderHook(() => useAuth())

    expect(result.current.loading).toBe(true)
    expect(result.current.uid).toBeNull()
    expect(result.current.perfil).toBeNull()
    expect(result.current.primeiroAcesso).toBe(false)
  })
})

describe('useAuth — usuário não autenticado', () => {
  it('retorna loading=false e uid=null quando Firebase sinaliza null', async () => {
    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await capturedCallback?.(null)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.uid).toBeNull()
    expect(result.current.perfil).toBeNull()
    expect(result.current.primeiroAcesso).toBe(false)
  })
})

describe('useAuth — aluno autenticado', () => {
  it('retorna perfil=aluno com primeiroAcesso=false', async () => {
    mockGetIdTokenResult.mockResolvedValue({ claims: { perfil: 'aluno' } })
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ primeiroAcesso: false }),
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await capturedCallback?.(mockAlunoUser)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.uid).toBe('aluno123')
    expect(result.current.perfil).toBe('aluno')
    expect(result.current.primeiroAcesso).toBe(false)
  })

  it('retorna primeiroAcesso=true quando flag está no Firestore', async () => {
    mockGetIdTokenResult.mockResolvedValue({ claims: { perfil: 'aluno' } })
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ primeiroAcesso: true }),
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await capturedCallback?.(mockAlunoUser)
    })

    expect(result.current.primeiroAcesso).toBe(true)
  })

  it('retorna primeiroAcesso=false quando documento não existe no Firestore', async () => {
    mockGetIdTokenResult.mockResolvedValue({ claims: { perfil: 'aluno' } })
    mockGetDoc.mockResolvedValue({ exists: () => false })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await capturedCallback?.(mockAlunoUser)
    })

    expect(result.current.primeiroAcesso).toBe(false)
  })
})

describe('useAuth — motorista autenticado', () => {
  it('retorna perfil=motorista consultando coleção motoristas', async () => {
    mockGetIdTokenResult.mockResolvedValue({ claims: { perfil: 'motorista' } })
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ primeiroAcesso: false }),
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await capturedCallback?.(mockMotoristaUser)
    })

    expect(result.current.perfil).toBe('motorista')
    expect(result.current.uid).toBe('motorista123')
  })
})

describe('useAuth — admin autenticado', () => {
  it('retorna perfil=admin sem consultar Firestore', async () => {
    mockGetIdTokenResult.mockResolvedValue({ claims: { perfil: 'admin' } })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await capturedCallback?.(mockAdminUser)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.perfil).toBe('admin')
    expect(result.current.primeiroAcesso).toBe(false)
    expect(mockGetDoc).not.toHaveBeenCalled()
  })
})

describe('useAuth — claims inválidas', () => {
  it('retorna perfil=null quando claims não têm perfil', async () => {
    mockGetIdTokenResult.mockResolvedValue({ claims: {} })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await capturedCallback?.(mockAlunoUser)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.uid).toBe('aluno123')
    expect(result.current.perfil).toBeNull()
  })

  it('retorna perfil=null quando perfil nas claims não é válido', async () => {
    mockGetIdTokenResult.mockResolvedValue({ claims: { perfil: 'desconhecido' } })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await capturedCallback?.(mockAlunoUser)
    })

    expect(result.current.perfil).toBeNull()
  })
})

describe('useAuth — limpeza', () => {
  it('retorna função de cancelamento ao desmontar', () => {
    const { unmount } = renderHook(() => useAuth())
    expect(() => unmount()).not.toThrow()
  })
})
