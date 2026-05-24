/**
 * Testes unitários do handler suspenderAluno — sem emulador.
 *
 * Responsabilidades do handler:
 * - Buscar advertências do aluno no Firestore
 * - Calcular dataReativacao (3 dias úteis, ignorando fins de semana e feriados do Firestore)
 * - Atualizar status do aluno via batch
 * - Criar notificação com resumo dos motivos via batch
 * - Apagar as advertências via batch
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

const mockAdvGet      = jest.fn()
const mockAdvWhere    = jest.fn(() => ({ get: mockAdvGet }))

const mockFeriadosGet    = jest.fn()
const mockFeriadosWhere2 = jest.fn(() => ({ get: mockFeriadosGet }))
const mockFeriadosWhere1 = jest.fn(() => ({ where: mockFeriadosWhere2 }))

const mockAlunosDoc  = jest.fn((id: string) => ({ id, _col: 'alunos' }))
const mockNotifDoc   = jest.fn(() => ({ id: 'notif-auto', _col: 'notificacoes' }))

const mockCollection = jest.fn((colName: string) => {
  if (colName === 'advertencias')  return { where: mockAdvWhere }
  if (colName === 'feriados')      return { where: mockFeriadosWhere1 }
  if (colName === 'alunos')        return { doc: mockAlunosDoc }
  if (colName === 'notificacoes')  return { doc: mockNotifDoc }
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
        batch:      jest.fn(() => mockBatch),
      })),
      {
        FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
      }
    ),
  },
}))

import { suspenderAluno } from '@/functions/suspenderAluno'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const fakeAdvDocs = [
  { data: () => ({ motivo: 'Atraso', alunoId: 'aluno-1' }), ref: { id: 'adv-1' } },
  { data: () => ({ motivo: 'Saída antecipada', alunoId: 'aluno-1' }), ref: { id: 'adv-2' } },
  { data: () => ({ motivo: 'Comportamento inadequado', alunoId: 'aluno-1' }), ref: { id: 'adv-3' } },
]

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  mockBatchCommit.mockResolvedValue(undefined)
  mockAdvGet.mockResolvedValue({ docs: fakeAdvDocs })
  mockFeriadosGet.mockResolvedValue({ docs: [] })
})

// ── Busca de advertências ─────────────────────────────────────────────────────

describe('suspenderAluno — busca de advertências', () => {
  it('busca a coleção advertencias', async () => {
    await suspenderAluno('aluno-1')
    expect(mockCollection).toHaveBeenCalledWith('advertencias')
  })

  it('filtra por alunoId', async () => {
    await suspenderAluno('aluno-1')
    expect(mockAdvWhere).toHaveBeenCalledWith('alunoId', '==', 'aluno-1')
  })
})

// ── Busca de feriados ─────────────────────────────────────────────────────────

describe('suspenderAluno — busca de feriados', () => {
  it('busca a coleção feriados', async () => {
    await suspenderAluno('aluno-1')
    expect(mockCollection).toHaveBeenCalledWith('feriados')
  })

  it('aplica filtro de data inicial a partir de hoje', async () => {
    const agora = new Date('2025-01-01T12:00:00')
    await suspenderAluno('aluno-1', agora)
    expect(mockFeriadosWhere1).toHaveBeenCalledWith('data', '>=', '2025-01-01')
  })

  it('aplica filtro de data final com janela generosa', async () => {
    const agora = new Date('2025-01-01T12:00:00')
    await suspenderAluno('aluno-1', agora)
    const [campo, operador] = mockFeriadosWhere2.mock.calls[0] as [string, string, string]
    expect(campo).toBe('data')
    expect(operador).toBe('<=')
  })
})

// ── Cálculo de datas ──────────────────────────────────────────────────────────

describe('suspenderAluno — cálculo de datas', () => {
  it('salva dataSuspensao no formato YYYY-MM-DD', async () => {
    const agora = new Date('2025-06-10T12:00:00')
    await suspenderAluno('aluno-1', agora)
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ dataSuspensao: '2025-06-10' })
    )
  })

  it('calcula dataReativacao com 3 dias úteis (quarta → segunda)', async () => {
    // 2025-01-01 = quarta, 3 dias úteis = 2025-01-06 (segunda)
    const agora = new Date('2025-01-01T12:00:00')
    await suspenderAluno('aluno-1', agora)
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ dataReativacao: '2025-01-06' })
    )
  })

  it('pula sábado e domingo no cálculo da dataReativacao', async () => {
    // 2025-01-03 = sexta, 3 dias úteis = 2025-01-08 (quarta, pula sáb/dom)
    const agora = new Date('2025-01-03T12:00:00')
    await suspenderAluno('aluno-1', agora)
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ dataReativacao: '2025-01-08' })
    )
  })

  it('pula feriado do Firestore no cálculo da dataReativacao', async () => {
    // 2025-01-02 = quinta, feriado em 2025-01-07 (terça)
    // Sem feriado: qui→sex(1)→seg(2)→ter(3) = 2025-01-07
    // Com feriado em 07: qui→sex(1)→seg(2)→ter FERIADO→qua(3) = 2025-01-08
    const agora = new Date('2025-01-02T12:00:00')
    mockFeriadosGet.mockResolvedValue({
      docs: [{ data: () => ({ data: '2025-01-07' }) }],
    })
    await suspenderAluno('aluno-1', agora)
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ dataReativacao: '2025-01-08' })
    )
  })
})

// ── Atualização do aluno ──────────────────────────────────────────────────────

describe('suspenderAluno — atualização do aluno', () => {
  it('atualiza o documento do aluno via batch', async () => {
    await suspenderAluno('aluno-1')
    expect(mockBatchUpdate).toHaveBeenCalled()
    expect(mockCollection).toHaveBeenCalledWith('alunos')
    expect(mockAlunosDoc).toHaveBeenCalledWith('aluno-1')
  })

  it('define status como suspenso', async () => {
    await suspenderAluno('aluno-1')
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'suspenso' })
    )
  })
})

// ── Criação de notificação ────────────────────────────────────────────────────

describe('suspenderAluno — notificação', () => {
  it('cria notificação na coleção notificacoes via batch', async () => {
    await suspenderAluno('aluno-1')
    expect(mockBatchSet).toHaveBeenCalled()
    expect(mockCollection).toHaveBeenCalledWith('notificacoes')
  })

  it('notificação tem tipo suspensao_confirmada', async () => {
    await suspenderAluno('aluno-1')
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tipo: 'suspensao_confirmada' })
    )
  })

  it('notificação tem alunoId correto', async () => {
    await suspenderAluno('aluno-2')
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ alunoId: 'aluno-2' })
    )
  })

  it('notificação tem lida: false', async () => {
    await suspenderAluno('aluno-1')
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lida: false })
    )
  })

  it('notificação inclui os motivos das advertências na mensagem', async () => {
    await suspenderAluno('aluno-1')
    const [, dados] = mockBatchSet.mock.calls[0] as [unknown, { mensagem: string }]
    expect(dados.mensagem).toContain('Atraso')
    expect(dados.mensagem).toContain('Saída antecipada')
    expect(dados.mensagem).toContain('Comportamento inadequado')
  })

  it('notificação usa serverTimestamp para criadaEm', async () => {
    await suspenderAluno('aluno-1')
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ criadaEm: 'SERVER_TIMESTAMP' })
    )
  })
})

// ── Deleção das advertências ──────────────────────────────────────────────────

describe('suspenderAluno — deleção de advertências', () => {
  it('apaga cada advertência via batch.delete', async () => {
    await suspenderAluno('aluno-1')
    expect(mockBatchDelete).toHaveBeenCalledTimes(3)
    expect(mockBatchDelete).toHaveBeenCalledWith({ id: 'adv-1' })
    expect(mockBatchDelete).toHaveBeenCalledWith({ id: 'adv-2' })
    expect(mockBatchDelete).toHaveBeenCalledWith({ id: 'adv-3' })
  })

  it('não apaga advertências se não houver nenhuma', async () => {
    mockAdvGet.mockResolvedValue({ docs: [] })
    await suspenderAluno('aluno-1')
    expect(mockBatchDelete).not.toHaveBeenCalled()
  })
})

// ── Atomicidade ───────────────────────────────────────────────────────────────

describe('suspenderAluno — atomicidade', () => {
  it('commita o batch ao final', async () => {
    await suspenderAluno('aluno-1')
    expect(mockBatchCommit).toHaveBeenCalledTimes(1)
  })
})
