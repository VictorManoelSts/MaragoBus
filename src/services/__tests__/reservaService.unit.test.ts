import { reservaService, RESERVA_ERROS } from '@/services/reservaService'
import { StatusAluno } from '@/types/aluno'

// ── Mocks Firebase ────────────────────────────────────────────────────────────

const mockAddDoc = jest.fn()
const mockGetDoc = jest.fn()
const mockDeleteDoc = jest.fn()
const mockGetDocs = jest.fn()
const mockQuery = jest.fn()
const mockWhere = jest.fn()
const mockCollection = jest.fn()
const mockDoc = jest.fn()
const mockServerTimestamp = jest.fn()
const mockTimestampNow = jest.fn()

jest.mock('@/lib/firebase', () => ({ auth: {}, db: {} }))

jest.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  serverTimestamp: () => mockServerTimestamp(),
  Timestamp: { now: () => mockTimestampNow() },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const JANELA_ABERTA = new Date(2024, 0, 15, 18, 0)   // 18h → aberta
const JANELA_FECHADA = new Date(2024, 0, 15, 14, 0)  // 14h → fechada
const CANCELAMENTO_OK = new Date(2024, 0, 15, 10, 0) // 10h → permitido
const CANCELAMENTO_EXP = new Date(2024, 0, 15, 17, 0) // 17h → expirado

function makeAlunoSnap(status: StatusAluno) {
  return {
    exists: () => true,
    data: () => ({ status, primeiroAcesso: false }),
  }
}

function makeReservaSnap(alunoId: string, data = '2024-01-16') {
  return {
    exists: () => true,
    data: () => ({ alunoId, pontoEscolhido: 'Ponto Central', data, criadaEm: {} }),
  }
}

function makeQuerySnap(docs: { id: string; alunoId: string; pontoEscolhido: string; data: string }[]) {
  return {
    empty: docs.length === 0,
    docs: docs.map((d) => ({
      id: d.id,
      data: () => ({ alunoId: d.alunoId, pontoEscolhido: d.pontoEscolhido, data: d.data, criadaEm: {} }),
    })),
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockDoc.mockReturnValue('doc-ref')
  mockCollection.mockReturnValue('col-ref')
  mockQuery.mockReturnValue('query-ref')
  mockWhere.mockReturnValue('where-constraint')
  mockServerTimestamp.mockReturnValue('server-ts')
  mockTimestampNow.mockReturnValue({})
})

// ── criarReserva ──────────────────────────────────────────────────────────────

describe('criarReserva — janela aberta e aluno ativo', () => {
  it('retorna Reserva com id, alunoId, pontoEscolhido e data', async () => {
    mockGetDoc.mockResolvedValueOnce(makeAlunoSnap(StatusAluno.Ativo))
    mockAddDoc.mockResolvedValueOnce({ id: 'nova-reserva-id' })

    const result = await reservaService.criarReserva(
      'aluno-1', 'Ponto Central', '2024-01-16', JANELA_ABERTA
    )

    expect(result).toMatchObject({
      id: 'nova-reserva-id',
      alunoId: 'aluno-1',
      pontoEscolhido: 'Ponto Central',
      data: '2024-01-16',
    })
  })

  it('chama addDoc com alunoId, pontoEscolhido, data e serverTimestamp', async () => {
    mockGetDoc.mockResolvedValueOnce(makeAlunoSnap(StatusAluno.Ativo))
    mockAddDoc.mockResolvedValueOnce({ id: 'nova-reserva-id' })

    await reservaService.criarReserva('aluno-1', 'Ponto Central', '2024-01-16', JANELA_ABERTA)

    expect(mockAddDoc).toHaveBeenCalledWith(
      'col-ref',
      expect.objectContaining({
        alunoId: 'aluno-1',
        pontoEscolhido: 'Ponto Central',
        data: '2024-01-16',
        criadaEm: 'server-ts',
      })
    )
  })

  it('consulta o documento do aluno antes de criar a reserva', async () => {
    mockGetDoc.mockResolvedValueOnce(makeAlunoSnap(StatusAluno.Ativo))
    mockAddDoc.mockResolvedValueOnce({ id: 'nova-reserva-id' })

    await reservaService.criarReserva('aluno-1', 'Ponto Central', '2024-01-16', JANELA_ABERTA)

    expect(mockDoc).toHaveBeenCalledWith({}, 'alunos', 'aluno-1')
    expect(mockGetDoc).toHaveBeenCalledTimes(1)
  })
})

describe('criarReserva — janela fechada', () => {
  it('lança erro com code=reserva/janela-fechada às 14h', async () => {
    await expect(
      reservaService.criarReserva('aluno-1', 'Ponto Central', '2024-01-16', JANELA_FECHADA)
    ).rejects.toMatchObject({ code: RESERVA_ERROS.JANELA_FECHADA })
  })

  it('não consulta o Firestore quando janela está fechada', async () => {
    await expect(
      reservaService.criarReserva('aluno-1', 'Ponto Central', '2024-01-16', JANELA_FECHADA)
    ).rejects.toBeDefined()

    expect(mockGetDoc).not.toHaveBeenCalled()
    expect(mockAddDoc).not.toHaveBeenCalled()
  })

  it('lança com mensagem descritiva', async () => {
    await expect(
      reservaService.criarReserva('aluno-1', 'Ponto', '2024-01-16', JANELA_FECHADA)
    ).rejects.toMatchObject({ message: expect.stringContaining('janela') })
  })
})

describe('criarReserva — aluno suspenso', () => {
  it('lança erro com code=reserva/aluno-suspenso', async () => {
    mockGetDoc.mockResolvedValueOnce(makeAlunoSnap(StatusAluno.Suspenso))

    await expect(
      reservaService.criarReserva('aluno-1', 'Ponto Central', '2024-01-16', JANELA_ABERTA)
    ).rejects.toMatchObject({ code: RESERVA_ERROS.ALUNO_SUSPENSO })
  })

  it('não chama addDoc quando aluno está suspenso', async () => {
    mockGetDoc.mockResolvedValueOnce(makeAlunoSnap(StatusAluno.Suspenso))

    await expect(
      reservaService.criarReserva('aluno-1', 'Ponto', '2024-01-16', JANELA_ABERTA)
    ).rejects.toBeDefined()

    expect(mockAddDoc).not.toHaveBeenCalled()
  })
})

describe('criarReserva — aluno não encontrado', () => {
  it('lança erro quando documento do aluno não existe', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false, data: () => undefined })

    await expect(
      reservaService.criarReserva('aluno-x', 'Ponto', '2024-01-16', JANELA_ABERTA)
    ).rejects.toThrow()
  })
})

// ── cancelarReserva ───────────────────────────────────────────────────────────

describe('cancelarReserva — cancelamento permitido', () => {
  it('chama deleteDoc quando dentro do prazo (10h)', async () => {
    mockGetDoc.mockResolvedValueOnce(makeReservaSnap('aluno-1'))

    await reservaService.cancelarReserva('reserva-1', 'aluno-1', CANCELAMENTO_OK)

    expect(mockDeleteDoc).toHaveBeenCalledTimes(1)
  })

  it('busca a reserva pelo id correto antes de deletar', async () => {
    mockGetDoc.mockResolvedValueOnce(makeReservaSnap('aluno-1'))

    await reservaService.cancelarReserva('reserva-abc', 'aluno-1', CANCELAMENTO_OK)

    expect(mockDoc).toHaveBeenCalledWith({}, 'reservas', 'reserva-abc')
  })
})

describe('cancelarReserva — cancelamento expirado', () => {
  it('lança erro com code=reserva/cancelamento-expirado às 17h', async () => {
    await expect(
      reservaService.cancelarReserva('reserva-1', 'aluno-1', CANCELAMENTO_EXP)
    ).rejects.toMatchObject({ code: RESERVA_ERROS.CANCELAMENTO_EXPIRADO })
  })

  it('não consulta o Firestore quando prazo expirado', async () => {
    await expect(
      reservaService.cancelarReserva('reserva-1', 'aluno-1', CANCELAMENTO_EXP)
    ).rejects.toBeDefined()

    expect(mockGetDoc).not.toHaveBeenCalled()
    expect(mockDeleteDoc).not.toHaveBeenCalled()
  })
})

describe('cancelarReserva — reserva não encontrada', () => {
  it('lança erro com code=reserva/nao-encontrada', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false })

    await expect(
      reservaService.cancelarReserva('reserva-x', 'aluno-1', CANCELAMENTO_OK)
    ).rejects.toMatchObject({ code: RESERVA_ERROS.RESERVA_NAO_ENCONTRADA })
  })
})

describe('cancelarReserva — reserva de outro aluno', () => {
  it('lança erro com code=reserva/nao-pertence-ao-aluno', async () => {
    mockGetDoc.mockResolvedValueOnce(makeReservaSnap('outro-aluno'))

    await expect(
      reservaService.cancelarReserva('reserva-1', 'aluno-1', CANCELAMENTO_OK)
    ).rejects.toMatchObject({ code: RESERVA_ERROS.RESERVA_NAO_PERTENCE_AO_ALUNO })
  })

  it('não chama deleteDoc quando reserva é de outro aluno', async () => {
    mockGetDoc.mockResolvedValueOnce(makeReservaSnap('outro-aluno'))

    await expect(
      reservaService.cancelarReserva('reserva-1', 'aluno-1', CANCELAMENTO_OK)
    ).rejects.toBeDefined()

    expect(mockDeleteDoc).not.toHaveBeenCalled()
  })
})

// ── buscarReservaAtiva ────────────────────────────────────────────────────────

describe('buscarReservaAtiva — reserva encontrada', () => {
  it('retorna Reserva com campos corretos', async () => {
    mockGetDocs.mockResolvedValueOnce(
      makeQuerySnap([{ id: 'r-1', alunoId: 'aluno-1', pontoEscolhido: 'Ponto Norte', data: '2024-01-16' }])
    )

    const result = await reservaService.buscarReservaAtiva('aluno-1', '2024-01-16')

    expect(result).toMatchObject({
      id: 'r-1',
      alunoId: 'aluno-1',
      pontoEscolhido: 'Ponto Norte',
      data: '2024-01-16',
    })
  })

  it('usa filtros where por alunoId e data', async () => {
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([
      { id: 'r-1', alunoId: 'aluno-1', pontoEscolhido: 'Ponto', data: '2024-01-16' }
    ]))

    await reservaService.buscarReservaAtiva('aluno-1', '2024-01-16')

    expect(mockWhere).toHaveBeenCalledWith('alunoId', '==', 'aluno-1')
    expect(mockWhere).toHaveBeenCalledWith('data', '==', '2024-01-16')
  })
})

describe('buscarReservaAtiva — sem reserva', () => {
  it('retorna null quando não há reserva para a data', async () => {
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([]))

    const result = await reservaService.buscarReservaAtiva('aluno-1', '2024-01-16')

    expect(result).toBeNull()
  })
})
