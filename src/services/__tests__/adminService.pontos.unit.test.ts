/**
 * Testes unitários — funções CRUD de pontos no adminService.
 */

jest.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }))
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }))
jest.mock('firebase/storage', () => ({
  ref: jest.fn(), uploadBytes: jest.fn(), getDownloadURL: jest.fn(),
}))

const mockCollection = jest.fn()
const mockDoc       = jest.fn()
const mockGetDocs   = jest.fn()
const mockQuery     = jest.fn()
const mockWhere     = jest.fn()
const mockAddDoc    = jest.fn()
const mockUpdateDoc = jest.fn()

jest.mock('firebase/firestore', () => ({
  collection:      (...args: unknown[]) => mockCollection(...args),
  query:           (...args: unknown[]) => mockQuery(...args),
  where:           (...args: unknown[]) => mockWhere(...args),
  getDocs:         (...args: unknown[]) => mockGetDocs(...args),
  doc:             (...args: unknown[]) => mockDoc(...args),
  getDoc:          jest.fn(),
  addDoc:          (...args: unknown[]) => mockAddDoc(...args),
  updateDoc:       (...args: unknown[]) => mockUpdateDoc(...args),
  writeBatch:      jest.fn(() => ({ delete: jest.fn(), commit: jest.fn() })),
  orderBy:         jest.fn(),
  setDoc:          jest.fn(),
  serverTimestamp: jest.fn(),
}))

import { adminService } from '@/services/adminService'

beforeEach(() => {
  jest.clearAllMocks()
  mockCollection.mockReturnValue('col-ref')
  mockDoc.mockReturnValue('doc-ref')
  mockQuery.mockReturnValue('query-ref')
  mockWhere.mockReturnValue('where-ref')
  mockAddDoc.mockResolvedValue({ id: 'ponto-novo-id' })
  mockUpdateDoc.mockResolvedValue(undefined)
})

// ── adicionarPonto ────────────────────────────────────────────────────────────

describe('adminService — adicionarPonto', () => {
  it('chama collection com "pontos"', async () => {
    await adminService.adicionarPonto('Praça Central')
    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), 'pontos')
  })

  it('chama addDoc com nome e ativo:true', async () => {
    await adminService.adicionarPonto('Praça Central')
    expect(mockAddDoc).toHaveBeenCalledWith('col-ref', { nome: 'Praça Central', ativo: true })
  })

  it('retorna o id do documento criado', async () => {
    const id = await adminService.adicionarPonto('Praça Central')
    expect(id).toBe('ponto-novo-id')
  })
})

// ── editarPonto ───────────────────────────────────────────────────────────────

describe('adminService — editarPonto', () => {
  it('referencia o doc de pontos com o id correto', async () => {
    await adminService.editarPonto('p1', 'Terminal Rodoviário')
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'pontos', 'p1')
  })

  it('chama updateDoc com o novo nome', async () => {
    await adminService.editarPonto('p1', 'Terminal Rodoviário')
    expect(mockUpdateDoc).toHaveBeenCalledWith('doc-ref', { nome: 'Terminal Rodoviário' })
  })
})

// ── removerPonto ──────────────────────────────────────────────────────────────

describe('adminService — removerPonto', () => {
  it('consulta alunos pelo pontoEmbarquePadrao', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] })
    await adminService.removerPonto('p1', 'Praça Central')
    expect(mockWhere).toHaveBeenCalledWith('pontoEmbarquePadrao', '==', 'Praça Central')
  })

  it('lança erro quando há alunos com o ponto como padrão', async () => {
    mockGetDocs.mockResolvedValue({ empty: false, docs: [{ id: 'a1' }] })
    await expect(adminService.removerPonto('p1', 'Praça Central')).rejects.toThrow(
      'Ponto em uso. Existem alunos com este ponto como padrão.'
    )
  })

  it('não chama updateDoc quando ponto está em uso', async () => {
    mockGetDocs.mockResolvedValue({ empty: false, docs: [{ id: 'a1' }] })
    await adminService.removerPonto('p1', 'Praça Central').catch(() => {})
    expect(mockUpdateDoc).not.toHaveBeenCalled()
  })

  it('chama updateDoc com ativo:false quando ponto está livre', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] })
    await adminService.removerPonto('p1', 'Praça Central')
    expect(mockUpdateDoc).toHaveBeenCalledWith('doc-ref', { ativo: false })
  })

  it('usa o id do ponto para referenciar o doc ao desativar', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] })
    await adminService.removerPonto('p1', 'Praça Central')
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'pontos', 'p1')
  })
})
