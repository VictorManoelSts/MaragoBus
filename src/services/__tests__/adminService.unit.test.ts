/**
 * Testes unitários de adminService — sem emulador.
 */

jest.mock('@/lib/firebase', () => ({ db: {} }))

const mockCollection = jest.fn()
const mockDoc = jest.fn()
const mockGetDoc = jest.fn()
const mockGetDocs = jest.fn()
const mockQuery = jest.fn()
const mockWhere = jest.fn()

jest.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  query:      (...args: unknown[]) => mockQuery(...args),
  where:      (...args: unknown[]) => mockWhere(...args),
  getDocs:    (...args: unknown[]) => mockGetDocs(...args),
  doc:        (...args: unknown[]) => mockDoc(...args),
  getDoc:     (...args: unknown[]) => mockGetDoc(...args),
}))

import { adminService } from '@/services/adminService'
import { StatusAluno, ModalidadeAluno } from '@/types/aluno'
import type { Aluno } from '@/types/aluno'

const ALUNO_FIXTURE: Omit<Aluno, 'id'> = {
  nome: 'Alice Santos',
  cpf: '12345678901',
  telefone: '(82) 99999-0000',
  endereco: 'Rua A',
  foto: null,
  faculdade: 'UFAL',
  curso: 'Direito',
  modalidade: ModalidadeAluno.Presencial,
  semestre: 3,
  anoConclusao: 2026,
  pontoEmbarquePadrao: 'Ponto Central',
  status: StatusAluno.Ativo,
  dataSuspensao: null,
  dataReativacao: null,
  primeiroAcesso: false,
}

function makeReservaSnap(reservas: Array<{ id: string; alunoId: string; pontoEscolhido: string }>) {
  return {
    empty: reservas.length === 0,
    docs: reservas.map(r => ({
      id: r.id,
      data: () => ({ alunoId: r.alunoId, pontoEscolhido: r.pontoEscolhido }),
    })),
  }
}

function makeAlunoDoc(id: string, dados: Omit<Aluno, 'id'> = ALUNO_FIXTURE) {
  return { exists: () => true, id, data: () => dados }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCollection.mockReturnValue('col-ref')
  mockDoc.mockReturnValue('doc-ref')
  mockQuery.mockReturnValue('query-ref')
  mockWhere.mockReturnValue('where-ref')
})

// ── buscarReservasDia ─────────────────────────────────────────────────────────

describe('adminService — buscarReservasDia', () => {
  it('retorna [] quando não há reservas', async () => {
    mockGetDocs.mockResolvedValue(makeReservaSnap([]))

    const resultado = await adminService.buscarReservasDia('2026-05-23')

    expect(resultado).toEqual([])
  })

  it('consulta reservas pelo campo data', async () => {
    mockGetDocs.mockResolvedValue(makeReservaSnap([]))

    await adminService.buscarReservasDia('2026-05-23')

    expect(mockWhere).toHaveBeenCalledWith('data', '==', '2026-05-23')
  })

  it('retorna aluno e ponto para cada reserva encontrada', async () => {
    mockGetDocs.mockResolvedValue(
      makeReservaSnap([{ id: 'r1', alunoId: 'a1', pontoEscolhido: 'Ponto Central' }])
    )
    mockGetDoc.mockResolvedValue(makeAlunoDoc('a1'))

    const resultado = await adminService.buscarReservasDia('2026-05-23')

    expect(resultado).toHaveLength(1)
    expect(resultado[0]).toMatchObject({
      reservaId: 'r1',
      aluno: expect.objectContaining({ id: 'a1', nome: 'Alice Santos' }),
      pontoEscolhido: 'Ponto Central',
    })
  })

  it('ignora reservas cujo aluno não existe no Firestore', async () => {
    mockGetDocs.mockResolvedValue(
      makeReservaSnap([
        { id: 'r1', alunoId: 'a1', pontoEscolhido: 'Ponto Central' },
        { id: 'r2', alunoId: 'fantasma', pontoEscolhido: 'Ponto Norte' },
      ])
    )
    mockGetDoc
      .mockResolvedValueOnce(makeAlunoDoc('a1'))
      .mockResolvedValueOnce({ exists: () => false })

    const resultado = await adminService.buscarReservasDia('2026-05-23')

    expect(resultado).toHaveLength(1)
    expect(resultado[0].reservaId).toBe('r1')
  })

  it('retorna múltiplas reservas corretamente', async () => {
    mockGetDocs.mockResolvedValue(
      makeReservaSnap([
        { id: 'r1', alunoId: 'a1', pontoEscolhido: 'Ponto A' },
        { id: 'r2', alunoId: 'a2', pontoEscolhido: 'Ponto B' },
      ])
    )
    mockGetDoc
      .mockResolvedValueOnce(makeAlunoDoc('a1', { ...ALUNO_FIXTURE, nome: 'Alice' }))
      .mockResolvedValueOnce(makeAlunoDoc('a2', { ...ALUNO_FIXTURE, nome: 'Bruno', faculdade: 'UNIT' }))

    const resultado = await adminService.buscarReservasDia('2026-05-23')

    expect(resultado).toHaveLength(2)
    expect(resultado[0].aluno.nome).toBe('Alice')
    expect(resultado[1].aluno.nome).toBe('Bruno')
  })
})
