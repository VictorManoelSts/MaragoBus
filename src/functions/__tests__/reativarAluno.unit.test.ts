/**
 * Testes unitários do handler reativarAluno — sem emulador.
 *
 * Responsabilidades do handler:
 * - Buscar alunos suspensos cuja dataReativacao <= hoje
 * - Para cada aluno, via batch:
 *     - Registrar punição em punicoes (histórico do admin)
 *     - Atualizar status para 'ativo' e zerar dataSuspensao/dataReativacao
 *     - Apagar advertências restantes (zerando o contador)
 * - Não fazer nada se não há alunos vencidos
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockBatchUpdate = jest.fn()
const mockBatchSet    = jest.fn()
const mockBatchDelete = jest.fn()
const mockBatchCommit = jest.fn()

const mockBatch = {
  update: mockBatchUpdate,
  set:    mockBatchSet,
  delete: mockBatchDelete,
  commit: mockBatchCommit,
}

// Alunos suspensos vencidos — query chain
const mockAlunosGet    = jest.fn()
const mockAlunosWhere2 = jest.fn(() => ({ get: mockAlunosGet }))
const mockAlunosWhere1 = jest.fn(() => ({ where: mockAlunosWhere2 }))
const mockAlunosDoc    = jest.fn((id: string) => ({ id, _col: 'alunos' }))

// Advertências restantes — query chain
const mockAdvGet   = jest.fn()
const mockAdvWhere = jest.fn(() => ({ get: mockAdvGet }))

// punicoes — novo doc ref
const mockPunicoesDoc = jest.fn(() => ({ id: 'punicao-auto', _col: 'punicoes' }))

const mockCollection = jest.fn((colName: string) => {
  if (colName === 'alunos')       return { where: mockAlunosWhere1, doc: mockAlunosDoc }
  if (colName === 'punicoes')     return { doc: mockPunicoesDoc }
  if (colName === 'advertencias') return { where: mockAdvWhere }
  throw new Error(`mockCollection: coleção não mockada: ${colName}`)
})

jest.mock('firebase-admin', () => ({
  __esModule: true,
  default: {
    apps: [{ name: '[DEFAULT]' }],
    initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
    firestore: Object.assign(
      jest.fn(() => ({
        collection: (...args: unknown[]) => mockCollection(...args as [string]),
        batch: jest.fn(() => mockBatch),
      })),
      {
        FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
      }
    ),
  },
}))

import { reativarAluno } from '@/functions/reativarAluno'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const fakeAluno1 = {
  id: 'aluno-1',
  data: () => ({ dataSuspensao: '2025-01-01', dataReativacao: '2025-01-06', status: 'suspenso' }),
}

const fakeAluno2 = {
  id: 'aluno-2',
  data: () => ({ dataSuspensao: '2025-01-03', dataReativacao: '2025-01-08', status: 'suspenso' }),
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  mockBatchCommit.mockResolvedValue(undefined)
  mockAlunosGet.mockResolvedValue({ docs: [fakeAluno1], empty: false })
  mockAdvGet.mockResolvedValue({ docs: [] })
})

// ── Busca de alunos ───────────────────────────────────────────────────────────

describe('reativarAluno — busca de alunos', () => {
  it('busca a coleção alunos', async () => {
    await reativarAluno()
    expect(mockCollection).toHaveBeenCalledWith('alunos')
  })

  it('filtra por status suspenso', async () => {
    await reativarAluno()
    expect(mockAlunosWhere1).toHaveBeenCalledWith('status', '==', 'suspenso')
  })

  it('filtra por dataReativacao <= hoje', async () => {
    const agora = new Date('2025-06-15T00:00:00Z')
    await reativarAluno(agora)
    expect(mockAlunosWhere2).toHaveBeenCalledWith('dataReativacao', '<=', '2025-06-15')
  })

  it('não faz nada se não há alunos para reativar', async () => {
    mockAlunosGet.mockResolvedValue({ docs: [], empty: true })
    await reativarAluno()
    expect(mockBatchCommit).not.toHaveBeenCalled()
  })
})

// ── Histórico de punição ──────────────────────────────────────────────────────

describe('reativarAluno — histórico de punição', () => {
  it('cria documento de punição via batch.set', async () => {
    await reativarAluno(new Date('2025-01-06T00:00:00Z'))
    expect(mockBatchSet).toHaveBeenCalled()
    expect(mockCollection).toHaveBeenCalledWith('punicoes')
  })

  it('punição tem alunoId correto', async () => {
    await reativarAluno(new Date('2025-01-06T00:00:00Z'))
    const [, dados] = mockBatchSet.mock.calls[0] as [unknown, { alunoId: string }]
    expect(dados.alunoId).toBe('aluno-1')
  })

  it('punição tem dataInicio igual à dataSuspensao do aluno', async () => {
    await reativarAluno(new Date('2025-01-06T00:00:00Z'))
    const [, dados] = mockBatchSet.mock.calls[0] as [unknown, { dataInicio: string }]
    expect(dados.dataInicio).toBe('2025-01-01')
  })

  it('punição tem dataFim igual a hoje', async () => {
    await reativarAluno(new Date('2025-01-06T00:00:00Z'))
    const [, dados] = mockBatchSet.mock.calls[0] as [unknown, { dataFim: string }]
    expect(dados.dataFim).toBe('2025-01-06')
  })

  it('punição tem campo explicacaoAdmin preenchido', async () => {
    await reativarAluno(new Date('2025-01-06T00:00:00Z'))
    const [, dados] = mockBatchSet.mock.calls[0] as [unknown, { explicacaoAdmin: string }]
    expect(dados.explicacaoAdmin).toBeTruthy()
  })

  it('punição tem motivos como array', async () => {
    await reativarAluno(new Date('2025-01-06T00:00:00Z'))
    const [, dados] = mockBatchSet.mock.calls[0] as [unknown, { motivos: unknown }]
    expect(Array.isArray(dados.motivos)).toBe(true)
  })
})

// ── Reativação do aluno ───────────────────────────────────────────────────────

describe('reativarAluno — atualização do aluno', () => {
  it('atualiza o documento do aluno via batch.update', async () => {
    await reativarAluno()
    expect(mockBatchUpdate).toHaveBeenCalled()
    expect(mockAlunosDoc).toHaveBeenCalledWith('aluno-1')
  })

  it('define status como ativo', async () => {
    await reativarAluno()
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'ativo' })
    )
  })

  it('zera dataSuspensao', async () => {
    await reativarAluno()
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ dataSuspensao: null })
    )
  })

  it('zera dataReativacao', async () => {
    await reativarAluno()
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ dataReativacao: null })
    )
  })
})

// ── Limpeza de advertências ───────────────────────────────────────────────────

describe('reativarAluno — limpeza de advertências', () => {
  it('busca advertências restantes do aluno', async () => {
    await reativarAluno()
    expect(mockCollection).toHaveBeenCalledWith('advertencias')
    expect(mockAdvWhere).toHaveBeenCalledWith('alunoId', '==', 'aluno-1')
  })

  it('apaga cada advertência restante via batch.delete', async () => {
    const advRef1 = { id: 'adv-restante-1' }
    const advRef2 = { id: 'adv-restante-2' }
    mockAdvGet.mockResolvedValue({
      docs: [
        { ref: advRef1 },
        { ref: advRef2 },
      ],
    })
    await reativarAluno()
    expect(mockBatchDelete).toHaveBeenCalledWith(advRef1)
    expect(mockBatchDelete).toHaveBeenCalledWith(advRef2)
  })

  it('não chama batch.delete quando não há advertências restantes', async () => {
    mockAdvGet.mockResolvedValue({ docs: [] })
    await reativarAluno()
    expect(mockBatchDelete).not.toHaveBeenCalled()
  })
})

// ── Múltiplos alunos ──────────────────────────────────────────────────────────

describe('reativarAluno — múltiplos alunos', () => {
  it('processa múltiplos alunos em um único batch', async () => {
    mockAlunosGet.mockResolvedValue({ docs: [fakeAluno1, fakeAluno2], empty: false })
    await reativarAluno(new Date('2025-01-08T00:00:00Z'))
    expect(mockBatchUpdate).toHaveBeenCalledTimes(2)
    expect(mockBatchSet).toHaveBeenCalledTimes(2)
    expect(mockBatchCommit).toHaveBeenCalledTimes(1)
  })

  it('cria punição para cada aluno', async () => {
    mockAlunosGet.mockResolvedValue({ docs: [fakeAluno1, fakeAluno2], empty: false })
    await reativarAluno(new Date('2025-01-08T00:00:00Z'))
    const alunoIds = mockBatchSet.mock.calls.map(([, d]: [unknown, { alunoId: string }]) => d.alunoId)
    expect(alunoIds).toContain('aluno-1')
    expect(alunoIds).toContain('aluno-2')
  })
})

// ── Atomicidade ───────────────────────────────────────────────────────────────

describe('reativarAluno — atomicidade', () => {
  it('commita o batch ao final', async () => {
    await reativarAluno()
    expect(mockBatchCommit).toHaveBeenCalledTimes(1)
  })
})
