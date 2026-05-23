/**
 * Testes unitários para as funções de detalhe do admin — sem emulador.
 */

jest.mock('@/lib/firebase', () => ({ db: {} }))

const mockCollection = jest.fn()
const mockDoc = jest.fn()
const mockGetDoc = jest.fn()
const mockGetDocs = jest.fn()
const mockUpdateDoc = jest.fn()
const mockQuery = jest.fn()
const mockWhere = jest.fn()
const mockOrderBy = jest.fn()

const mockBatch = { delete: jest.fn(), commit: jest.fn() }
const mockWriteBatch = jest.fn(() => mockBatch)

jest.mock('firebase/firestore', () => ({
  collection:  (...args: unknown[]) => mockCollection(...args),
  doc:         (...args: unknown[]) => mockDoc(...args),
  getDoc:      (...args: unknown[]) => mockGetDoc(...args),
  getDocs:     (...args: unknown[]) => mockGetDocs(...args),
  updateDoc:   (...args: unknown[]) => mockUpdateDoc(...args),
  query:       (...args: unknown[]) => mockQuery(...args),
  where:       (...args: unknown[]) => mockWhere(...args),
  orderBy:     (...args: unknown[]) => mockOrderBy(...args),
  writeBatch:  (...args: unknown[]) => mockWriteBatch(...args),
}))

import { adminService } from '@/services/adminService'
import { StatusAluno, ModalidadeAluno } from '@/types/aluno'
import { TipoAdvertencia } from '@/types/advertencia'
import type { Aluno } from '@/types/aluno'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ALUNO_DADOS: Omit<Aluno, 'id'> = {
  nome: 'Alice Santos',
  cpf: '12345678901',
  telefone: '(82) 99999-0000',
  endereco: 'Rua A',
  foto: null,
  faculdade: 'UFAL',
  curso: 'Direito',
  modalidade: ModalidadeAluno.Presencial,
  semestre: 3,
  anoConclusao: 2027,
  pontoEmbarquePadrao: 'Ponto Central',
  status: StatusAluno.Ativo,
  dataSuspensao: null,
  dataReativacao: null,
  primeiroAcesso: false,
}

function makeAlunoDoc(id: string, dados: Omit<Aluno, 'id'> = ALUNO_DADOS) {
  return { exists: () => true, id, data: () => dados }
}

function makeEmptyDoc() {
  return { exists: () => false }
}

function makeSnap(items: Array<{ id: string; ref: string }>) {
  return { docs: items.map(({ id, ref }) => ({ id, ref, data: () => ({}) })) }
}

function makeAdvSnap() {
  return {
    docs: [
      {
        id: 'adv-1',
        data: () => ({
          alunoId: 'a1',
          motivo: 'Falta',
          aplicadaPor: 'admin',
          tipo: TipoAdvertencia.Direta,
          data: {},
        }),
      },
    ],
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCollection.mockReturnValue('col-ref')
  mockDoc.mockReturnValue('doc-ref')
  mockQuery.mockReturnValue('query-ref')
  mockWhere.mockReturnValue('where-ref')
  mockOrderBy.mockReturnValue('order-ref')
  mockBatch.delete.mockReturnValue(undefined)
  mockBatch.commit.mockResolvedValue(undefined)
})

// ── buscarDetalheAluno ────────────────────────────────────────────────────────

describe('adminService — buscarDetalheAluno', () => {
  it('busca o documento do aluno pelo id', async () => {
    mockGetDoc.mockResolvedValue(makeAlunoDoc('a1'))
    mockGetDocs.mockResolvedValue({ docs: [] })

    await adminService.buscarDetalheAluno('a1')

    expect(mockDoc).toHaveBeenCalledWith({}, 'alunos', 'a1')
  })

  it('retorna aluno com id e dados', async () => {
    mockGetDoc.mockResolvedValue(makeAlunoDoc('a1'))
    mockGetDocs.mockResolvedValue({ docs: [] })

    const result = await adminService.buscarDetalheAluno('a1')

    expect(result.aluno).toMatchObject({ id: 'a1', nome: 'Alice Santos' })
  })

  it('retorna advertencias do aluno', async () => {
    mockGetDoc.mockResolvedValue(makeAlunoDoc('a1'))
    mockGetDocs.mockResolvedValue(makeAdvSnap())

    const result = await adminService.buscarDetalheAluno('a1')

    expect(result.advertencias).toHaveLength(1)
    expect(result.advertencias[0].motivo).toBe('Falta')
  })

  it('retorna advertencias vazia quando não há advertências', async () => {
    mockGetDoc.mockResolvedValue(makeAlunoDoc('a1'))
    mockGetDocs.mockResolvedValue({ docs: [] })

    const result = await adminService.buscarDetalheAluno('a1')

    expect(result.advertencias).toHaveLength(0)
  })

  it('lança erro quando aluno não existe', async () => {
    mockGetDoc.mockResolvedValue(makeEmptyDoc())

    await expect(adminService.buscarDetalheAluno('inexistente')).rejects.toThrow('Aluno não encontrado.')
  })

  it('filtra advertências por alunoId', async () => {
    mockGetDoc.mockResolvedValue(makeAlunoDoc('a1'))
    mockGetDocs.mockResolvedValue({ docs: [] })

    await adminService.buscarDetalheAluno('a1')

    expect(mockWhere).toHaveBeenCalledWith('alunoId', '==', 'a1')
  })
})

// ── suspenderAluno ────────────────────────────────────────────────────────────

describe('adminService — suspenderAluno', () => {
  it('atualiza status para Suspenso', async () => {
    mockUpdateDoc.mockResolvedValue(undefined)

    await adminService.suspenderAluno('a1', new Date(2026, 4, 20)) // quarta-feira

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({ status: StatusAluno.Suspenso })
    )
  })

  it('referencia o documento do aluno pelo id correto', async () => {
    mockUpdateDoc.mockResolvedValue(undefined)

    await adminService.suspenderAluno('a1', new Date(2026, 4, 20))

    expect(mockDoc).toHaveBeenCalledWith({}, 'alunos', 'a1')
  })

  it('define dataSuspensao como a data fornecida (ISO)', async () => {
    mockUpdateDoc.mockResolvedValue(undefined)

    await adminService.suspenderAluno('a1', new Date(2026, 4, 20)) // 2026-05-20

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({ dataSuspensao: '2026-05-20' })
    )
  })

  it('define dataReativacao como 3 dias úteis depois (quarta → segunda)', async () => {
    mockUpdateDoc.mockResolvedValue(undefined)

    // Quarta 20/05: +Qui(1) +Sex(2) +[Sáb skip] +[Dom skip] +Seg(3) = 25/05
    await adminService.suspenderAluno('a1', new Date(2026, 4, 20))

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({ dataReativacao: '2026-05-25' })
    )
  })

  it('define dataReativacao pulando fins de semana (sexta → quarta)', async () => {
    mockUpdateDoc.mockResolvedValue(undefined)

    // Sexta 22/05: +[Sáb skip] +[Dom skip] +Seg(1) +Ter(2) +Qua(3) = 27/05
    await adminService.suspenderAluno('a1', new Date(2026, 4, 22))

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({ dataReativacao: '2026-05-27' })
    )
  })

  it('propaga erro quando updateDoc falha', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('Permissão negada'))

    await expect(adminService.suspenderAluno('a1', new Date(2026, 4, 20))).rejects.toThrow('Permissão negada')
  })
})

// ── excluirAluno ──────────────────────────────────────────────────────────────

describe('adminService — excluirAluno', () => {
  it('exclui o documento do aluno no batch', async () => {
    mockGetDocs.mockResolvedValue(makeSnap([]))

    await adminService.excluirAluno('a1')

    expect(mockDoc).toHaveBeenCalledWith({}, 'alunos', 'a1')
    expect(mockBatch.delete).toHaveBeenCalledWith('doc-ref')
  })

  it('exclui as advertências do aluno no batch', async () => {
    mockGetDocs
      .mockResolvedValueOnce(makeSnap([{ id: 'adv-1', ref: 'ref-adv-1' }])) // advertências
      .mockResolvedValueOnce(makeSnap([]))                                    // reservas
      .mockResolvedValueOnce(makeSnap([]))                                    // punições

    await adminService.excluirAluno('a1')

    expect(mockBatch.delete).toHaveBeenCalledWith('ref-adv-1')
  })

  it('exclui as reservas do aluno no batch', async () => {
    mockGetDocs
      .mockResolvedValueOnce(makeSnap([]))                                    // advertências
      .mockResolvedValueOnce(makeSnap([{ id: 'res-1', ref: 'ref-res-1' }])) // reservas
      .mockResolvedValueOnce(makeSnap([]))                                    // punições

    await adminService.excluirAluno('a1')

    expect(mockBatch.delete).toHaveBeenCalledWith('ref-res-1')
  })

  it('exclui as punições do aluno no batch', async () => {
    mockGetDocs
      .mockResolvedValueOnce(makeSnap([]))                                    // advertências
      .mockResolvedValueOnce(makeSnap([]))                                    // reservas
      .mockResolvedValueOnce(makeSnap([{ id: 'pun-1', ref: 'ref-pun-1' }])) // punições

    await adminService.excluirAluno('a1')

    expect(mockBatch.delete).toHaveBeenCalledWith('ref-pun-1')
  })

  it('comita o batch ao final', async () => {
    mockGetDocs.mockResolvedValue(makeSnap([]))

    await adminService.excluirAluno('a1')

    expect(mockBatch.commit).toHaveBeenCalledTimes(1)
  })

  it('filtra advertências, reservas e punições pelo alunoId', async () => {
    mockGetDocs.mockResolvedValue(makeSnap([]))

    await adminService.excluirAluno('a1')

    const whereArgs = mockWhere.mock.calls
    expect(whereArgs.every(([campo, op, val]: [string, string, string]) =>
      campo === 'alunoId' && op === '==' && val === 'a1'
    )).toBe(true)
  })
})
