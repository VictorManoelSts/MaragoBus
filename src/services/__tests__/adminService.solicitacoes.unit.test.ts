/**
 * Testes unitários para as funções de solicitações do admin — sem emulador.
 */

jest.mock('@/lib/firebase', () => ({ db: {}, auth: { currentUser: { uid: 'admin-uid' } }, storage: {}, functions: {} }))
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }))
jest.mock('firebase/storage', () => ({ ref: jest.fn(), uploadBytes: jest.fn(), getDownloadURL: jest.fn() }))

const mockCollection = jest.fn()
const mockDoc = jest.fn()
const mockGetDoc = jest.fn()
const mockGetDocs = jest.fn()
const mockQuery = jest.fn()
const mockWhere = jest.fn()
const mockOrderBy = jest.fn()
const mockUpdateDoc = jest.fn()
const mockAddDoc = jest.fn()
const mockServerTimestamp = jest.fn()

jest.mock('firebase/firestore', () => ({
  collection:       (...args: unknown[]) => mockCollection(...args),
  query:            (...args: unknown[]) => mockQuery(...args),
  where:            (...args: unknown[]) => mockWhere(...args),
  orderBy:          (...args: unknown[]) => mockOrderBy(...args),
  getDocs:          (...args: unknown[]) => mockGetDocs(...args),
  doc:              (...args: unknown[]) => mockDoc(...args),
  getDoc:           (...args: unknown[]) => mockGetDoc(...args),
  updateDoc:        (...args: unknown[]) => mockUpdateDoc(...args),
  addDoc:           (...args: unknown[]) => mockAddDoc(...args),
  serverTimestamp:  () => mockServerTimestamp(),
  writeBatch:       jest.fn(),
  setDoc:           jest.fn(),
}))

import { adminService } from '@/services/adminService'
import { StatusSolicitacao, TipoAdvertencia } from '@/types/advertencia'
import type { Timestamp } from 'firebase/firestore'

const TIMESTAMP_FIXTURE = { toDate: () => new Date('2026-05-20') } as unknown as Timestamp

function makeSolicitacaoSnap(items: Array<{
  id: string; alunoId: string; motoristaId: string; motivo: string
}>) {
  return {
    empty: items.length === 0,
    docs: items.map((s) => ({
      id: s.id,
      data: () => ({
        alunoId: s.alunoId,
        motoristaId: s.motoristaId,
        motivo: s.motivo,
        status: StatusSolicitacao.Pendente,
        data: TIMESTAMP_FIXTURE,
      }),
    })),
  }
}

function makeAlunoDoc(nome: string) {
  return { exists: () => true, data: () => ({ nome }) }
}

function makeMotoristaDoc(nome: string) {
  return { exists: () => true, data: () => ({ nome }) }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCollection.mockReturnValue('col-ref')
  mockDoc.mockReturnValue('doc-ref')
  mockQuery.mockReturnValue('query-ref')
  mockWhere.mockReturnValue('where-ref')
  mockOrderBy.mockReturnValue('orderby-ref')
  mockUpdateDoc.mockResolvedValue(undefined)
  mockAddDoc.mockResolvedValue({ id: 'adv-id' })
  mockServerTimestamp.mockReturnValue('server-ts')
})

// ── buscarSolicitacoesPendentes ───────────────────────────────────────────────

describe('adminService — buscarSolicitacoesPendentes', () => {
  it('retorna [] quando não há solicitações pendentes', async () => {
    mockGetDocs.mockResolvedValue(makeSolicitacaoSnap([]))

    const resultado = await adminService.buscarSolicitacoesPendentes()

    expect(resultado).toEqual([])
  })

  it('filtra por status pendente', async () => {
    mockGetDocs.mockResolvedValue(makeSolicitacaoSnap([]))

    await adminService.buscarSolicitacoesPendentes()

    expect(mockWhere).toHaveBeenCalledWith('status', '==', StatusSolicitacao.Pendente)
  })

  it('retorna solicitação com nomes de aluno e motorista', async () => {
    mockGetDocs.mockResolvedValue(
      makeSolicitacaoSnap([{ id: 's1', alunoId: 'a1', motoristaId: 'm1', motivo: 'Faltou' }])
    )
    mockGetDoc
      .mockResolvedValueOnce(makeAlunoDoc('Alice Santos'))
      .mockResolvedValueOnce(makeMotoristaDoc('Carlos Silva'))

    const resultado = await adminService.buscarSolicitacoesPendentes()

    expect(resultado).toHaveLength(1)
    expect(resultado[0]).toMatchObject({
      id: 's1',
      alunoId: 'a1',
      motoristaId: 'm1',
      nomeAluno: 'Alice Santos',
      nomeMotorista: 'Carlos Silva',
      motivo: 'Faltou',
    })
  })

  it('usa "Aluno desconhecido" quando aluno não existe no Firestore', async () => {
    mockGetDocs.mockResolvedValue(
      makeSolicitacaoSnap([{ id: 's1', alunoId: 'a1', motoristaId: 'm1', motivo: 'Faltou' }])
    )
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => false })
      .mockResolvedValueOnce(makeMotoristaDoc('Carlos'))

    const resultado = await adminService.buscarSolicitacoesPendentes()

    expect(resultado[0].nomeAluno).toBe('Aluno desconhecido')
  })

  it('usa "Motorista desconhecido" quando motorista não existe no Firestore', async () => {
    mockGetDocs.mockResolvedValue(
      makeSolicitacaoSnap([{ id: 's1', alunoId: 'a1', motoristaId: 'm1', motivo: 'Faltou' }])
    )
    mockGetDoc
      .mockResolvedValueOnce(makeAlunoDoc('Alice'))
      .mockResolvedValueOnce({ exists: () => false })

    const resultado = await adminService.buscarSolicitacoesPendentes()

    expect(resultado[0].nomeMotorista).toBe('Motorista desconhecido')
  })

  it('retorna múltiplas solicitações corretamente', async () => {
    mockGetDocs.mockResolvedValue(
      makeSolicitacaoSnap([
        { id: 's1', alunoId: 'a1', motoristaId: 'm1', motivo: 'Faltou' },
        { id: 's2', alunoId: 'a2', motoristaId: 'm1', motivo: 'Chegou tarde' },
      ])
    )
    mockGetDoc
      .mockResolvedValueOnce(makeAlunoDoc('Alice'))
      .mockResolvedValueOnce(makeAlunoDoc('Bruno'))
      .mockResolvedValueOnce(makeMotoristaDoc('Carlos'))
      .mockResolvedValueOnce(makeMotoristaDoc('Carlos'))

    const resultado = await adminService.buscarSolicitacoesPendentes()

    expect(resultado).toHaveLength(2)
    expect(resultado[0].nomeAluno).toBe('Alice')
    expect(resultado[1].nomeAluno).toBe('Bruno')
  })
})

// ── confirmarSolicitacao ──────────────────────────────────────────────────────

describe('adminService — confirmarSolicitacao', () => {
  it('atualiza status para confirmada com justificativa', async () => {
    await adminService.confirmarSolicitacao('s1', 'a1', 'Faltou', 'Confirmado após revisão')

    expect(mockUpdateDoc).toHaveBeenCalledWith('doc-ref', {
      status: StatusSolicitacao.Confirmada,
      justificativa: 'Confirmado após revisão',
    })
  })

  it('cria advertência na coleção advertencias', async () => {
    await adminService.confirmarSolicitacao('s1', 'a1', 'Faltou', 'Confirmado')

    expect(mockAddDoc).toHaveBeenCalledWith('col-ref', expect.objectContaining({
      alunoId: 'a1',
      motivo: 'Faltou',
      tipo: TipoAdvertencia.Solicitacao,
    }))
  })

  it('usa o UID do admin como aplicadaPor na advertência', async () => {
    await adminService.confirmarSolicitacao('s1', 'a1', 'Faltou', 'Confirmado')

    expect(mockAddDoc).toHaveBeenCalledWith('col-ref', expect.objectContaining({
      aplicadaPor: 'admin-uid',
    }))
  })
})

// ── rejeitarSolicitacao ───────────────────────────────────────────────────────

describe('adminService — rejeitarSolicitacao', () => {
  it('atualiza status para rejeitada com justificativa', async () => {
    await adminService.rejeitarSolicitacao('s1', 'Motivo insuficiente')

    expect(mockUpdateDoc).toHaveBeenCalledWith('doc-ref', {
      status: StatusSolicitacao.Rejeitada,
      justificativa: 'Motivo insuficiente',
    })
  })

  it('não cria advertência ao rejeitar', async () => {
    await adminService.rejeitarSolicitacao('s1', 'Motivo insuficiente')

    expect(mockAddDoc).not.toHaveBeenCalled()
  })
})
