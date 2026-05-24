/**
 * Testes unitários do handler expirarAcesso — sem emulador.
 *
 * Responsabilidades do handler:
 * - Buscar alunos com anoConclusao < anoAtual
 * - Desativar cada um no Firebase Authentication (disabled: true)
 * - Atualizar o status no Firestore para 'concluindo' via batch
 * - Não fazer nada se não há alunos vencidos
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUpdateUser  = jest.fn()

const mockBatchUpdate = jest.fn()
const mockBatchCommit = jest.fn()
const mockBatch = {
  update: mockBatchUpdate,
  commit: mockBatchCommit,
}

// Alunos — query chain (uma única cláusula where)
const mockAlunosGet    = jest.fn()
const mockAlunosWhere1 = jest.fn(() => ({ get: mockAlunosGet }))
const mockAlunosDoc    = jest.fn((id: string) => ({ id, _col: 'alunos' }))

const mockCollection = jest.fn((colName: string) => {
  if (colName === 'alunos') return { where: mockAlunosWhere1, doc: mockAlunosDoc }
  throw new Error(`mockCollection: coleção não mockada: ${colName}`)
})

jest.mock('firebase-admin', () => ({
  __esModule: true,
  default: {
    apps: [{ name: '[DEFAULT]' }],
    initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
    auth: jest.fn(() => ({
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    })),
    firestore: Object.assign(
      jest.fn(() => ({
        collection: (...args: unknown[]) => mockCollection(...args as [string]),
        batch: jest.fn(() => mockBatch),
      })),
      {}
    ),
  },
}))

import { expirarAcesso } from '@/functions/expirarAcesso'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const fakeAluno1 = { id: 'aluno-1', data: () => ({ anoConclusao: 2023, status: 'ativo' }) }
const fakeAluno2 = { id: 'aluno-2', data: () => ({ anoConclusao: 2022, status: 'ativo' }) }

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  mockBatchCommit.mockResolvedValue(undefined)
  mockUpdateUser.mockResolvedValue(undefined)
  mockAlunosGet.mockResolvedValue({ docs: [fakeAluno1], empty: false })
})

// ── Busca de alunos ───────────────────────────────────────────────────────────

describe('expirarAcesso — busca de alunos', () => {
  it('busca a coleção alunos', async () => {
    await expirarAcesso()
    expect(mockCollection).toHaveBeenCalledWith('alunos')
  })

  it('filtra por anoConclusao < anoAtual', async () => {
    await expirarAcesso()
    expect(mockAlunosWhere1).toHaveBeenCalledWith('anoConclusao', '<', expect.any(Number))
  })

  it('usa o ano de agora como limite', async () => {
    const agora = new Date('2025-01-06T00:00:00Z')
    await expirarAcesso(agora)
    expect(mockAlunosWhere1).toHaveBeenCalledWith('anoConclusao', '<', 2025)
  })

  it('não faz nada se não há alunos vencidos', async () => {
    mockAlunosGet.mockResolvedValue({ docs: [], empty: true })
    await expirarAcesso()
    expect(mockUpdateUser).not.toHaveBeenCalled()
    expect(mockBatchCommit).not.toHaveBeenCalled()
  })
})

// ── Desativação no Firebase Auth ──────────────────────────────────────────────

describe('expirarAcesso — Firebase Auth', () => {
  it('chama updateUser para desativar o aluno', async () => {
    await expirarAcesso()
    expect(mockUpdateUser).toHaveBeenCalled()
  })

  it('usa o id do documento como uid', async () => {
    await expirarAcesso()
    expect(mockUpdateUser).toHaveBeenCalledWith('aluno-1', expect.anything())
  })

  it('passa disabled: true no updateUser', async () => {
    await expirarAcesso()
    expect(mockUpdateUser).toHaveBeenCalledWith(expect.anything(), { disabled: true })
  })

  it('desativa múltiplos alunos', async () => {
    mockAlunosGet.mockResolvedValue({ docs: [fakeAluno1, fakeAluno2], empty: false })
    await expirarAcesso()
    expect(mockUpdateUser).toHaveBeenCalledTimes(2)
    expect(mockUpdateUser).toHaveBeenCalledWith('aluno-1', { disabled: true })
    expect(mockUpdateUser).toHaveBeenCalledWith('aluno-2', { disabled: true })
  })
})

// ── Atualização do status no Firestore ───────────────────────────────────────

describe('expirarAcesso — Firestore', () => {
  it('atualiza o documento do aluno via batch', async () => {
    await expirarAcesso()
    expect(mockBatchUpdate).toHaveBeenCalled()
    expect(mockAlunosDoc).toHaveBeenCalledWith('aluno-1')
  })

  it('define o status como concluindo', async () => {
    await expirarAcesso()
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'concluindo' })
    )
  })

  it('processa múltiplos alunos no mesmo batch', async () => {
    mockAlunosGet.mockResolvedValue({ docs: [fakeAluno1, fakeAluno2], empty: false })
    await expirarAcesso()
    expect(mockBatchUpdate).toHaveBeenCalledTimes(2)
    expect(mockBatchCommit).toHaveBeenCalledTimes(1)
  })
})

// ── Atomicidade ───────────────────────────────────────────────────────────────

describe('expirarAcesso — atomicidade', () => {
  it('commita o batch ao final', async () => {
    await expirarAcesso()
    expect(mockBatchCommit).toHaveBeenCalledTimes(1)
  })
})
