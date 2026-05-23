/**
 * Testes unitários de alunoService — sem emulador.
 */

jest.mock('@/lib/firebase', () => ({ db: {} }))

const mockCollection = jest.fn()
const mockDoc = jest.fn()
const mockGetDocs = jest.fn()
const mockUpdateDoc = jest.fn()

jest.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  getDocs:    (...args: unknown[]) => mockGetDocs(...args),
  doc:        (...args: unknown[]) => mockDoc(...args),
  updateDoc:  (...args: unknown[]) => mockUpdateDoc(...args),
}))

import { alunoService } from '@/services/alunoService'
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

function makeAlunoSnap(alunos: Array<{ id: string; dados: Omit<Aluno, 'id'> }>) {
  return {
    docs: alunos.map((a) => ({
      id: a.id,
      data: () => a.dados,
    })),
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCollection.mockReturnValue('col-ref')
  mockDoc.mockReturnValue('doc-ref')
})

// ── buscarAlunos ──────────────────────────────────────────────────────────────

describe('alunoService — buscarAlunos', () => {
  it('retorna [] quando coleção está vazia', async () => {
    mockGetDocs.mockResolvedValue(makeAlunoSnap([]))

    const resultado = await alunoService.buscarAlunos()

    expect(resultado).toEqual([])
  })

  it('busca da coleção alunos', async () => {
    mockGetDocs.mockResolvedValue(makeAlunoSnap([]))

    await alunoService.buscarAlunos()

    expect(mockCollection).toHaveBeenCalledWith({}, 'alunos')
  })

  it('retorna aluno com id e dados corretos', async () => {
    mockGetDocs.mockResolvedValue(makeAlunoSnap([{ id: 'a1', dados: ALUNO_FIXTURE }]))

    const resultado = await alunoService.buscarAlunos()

    expect(resultado).toHaveLength(1)
    expect(resultado[0]).toMatchObject({ id: 'a1', nome: 'Alice Santos' })
  })

  it('retorna múltiplos alunos', async () => {
    mockGetDocs.mockResolvedValue(
      makeAlunoSnap([
        { id: 'a1', dados: { ...ALUNO_FIXTURE, nome: 'Alice' } },
        { id: 'a2', dados: { ...ALUNO_FIXTURE, nome: 'Bruno' } },
      ])
    )

    const resultado = await alunoService.buscarAlunos()

    expect(resultado).toHaveLength(2)
    expect(resultado[0].nome).toBe('Alice')
    expect(resultado[1].nome).toBe('Bruno')
  })

  it('propaga erro quando getDocs falha', async () => {
    mockGetDocs.mockRejectedValue(new Error('Firestore indisponível'))

    await expect(alunoService.buscarAlunos()).rejects.toThrow('Firestore indisponível')
  })
})

// ── reativarAluno ─────────────────────────────────────────────────────────────

describe('alunoService — reativarAluno', () => {
  it('referencia o documento do aluno pelo id correto', async () => {
    mockUpdateDoc.mockResolvedValue(undefined)

    await alunoService.reativarAluno('a1')

    expect(mockDoc).toHaveBeenCalledWith({}, 'alunos', 'a1')
  })

  it('atualiza status para Ativo', async () => {
    mockUpdateDoc.mockResolvedValue(undefined)

    await alunoService.reativarAluno('a1')

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({ status: StatusAluno.Ativo })
    )
  })

  it('limpa dataSuspensao e dataReativacao', async () => {
    mockUpdateDoc.mockResolvedValue(undefined)

    await alunoService.reativarAluno('a1')

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({ dataSuspensao: null, dataReativacao: null })
    )
  })

  it('propaga erro quando updateDoc falha', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('Permissão negada'))

    await expect(alunoService.reativarAluno('a1')).rejects.toThrow('Permissão negada')
  })
})
