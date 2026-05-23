import { renderHook, act, waitFor } from '@testing-library/react'
import { useReserva } from '@/hooks/useReserva'
import { StatusAluno, ModalidadeAluno } from '@/types/aluno'
import type { Aluno } from '@/types/aluno'
import type { Ponto } from '@/types/ponto'
import type { Reserva } from '@/types/reserva'

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/lib/firebase', () => ({
  auth: { currentUser: { uid: 'aluno-1' } },
  db: {},
}))

const mockGetDoc = jest.fn()
const mockGetDocs = jest.fn()
const mockDoc = jest.fn()
const mockQuery = jest.fn()
const mockCollection = jest.fn()
const mockWhere = jest.fn()

jest.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}))

const mockCriarReserva = jest.fn()
const mockCancelarReserva = jest.fn()
const mockBuscarReservaAtiva = jest.fn()

jest.mock('@/services/reservaService', () => ({
  reservaService: {
    criarReserva: (...args: unknown[]) => mockCriarReserva(...args),
    cancelarReserva: (...args: unknown[]) => mockCancelarReserva(...args),
    buscarReservaAtiva: (...args: unknown[]) => mockBuscarReservaAtiva(...args),
  },
  RESERVA_ERROS: {
    JANELA_FECHADA: 'reserva/janela-fechada',
    ALUNO_SUSPENSO: 'reserva/aluno-suspenso',
    CANCELAMENTO_EXPIRADO: 'reserva/cancelamento-expirado',
    RESERVA_NAO_ENCONTRADA: 'reserva/nao-encontrada',
    RESERVA_NAO_PERTENCE_AO_ALUNO: 'reserva/nao-pertence-ao-aluno',
  },
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const AGORA_JANELA_ABERTA = new Date(2024, 0, 15, 18, 0)   // 18h → aberta
const AGORA_JANELA_FECHADA = new Date(2024, 0, 15, 14, 0)  // 14h → fechada
const AGORA_CANCEL_OK = new Date(2024, 0, 15, 10, 0)       // 10h → cancelamento ok
const AGORA_CANCEL_EXP = new Date(2024, 0, 15, 17, 0)      // 17h → cancelamento expirado

const mockAluno: Aluno = {
  id: 'aluno-1',
  nome: 'Luana Beatriz',
  cpf: '12345678901',
  telefone: '82999999999',
  endereco: 'Rua das Flores, 123',
  foto: null,
  faculdade: 'Uninassau',
  curso: 'Direito',
  modalidade: ModalidadeAluno.Presencial,
  semestre: 3,
  anoConclusao: 2026,
  pontoEmbarquePadrao: 'Praça Central',
  status: StatusAluno.Ativo,
  dataSuspensao: null,
  dataReativacao: null,
  primeiroAcesso: false,
}

const mockPontos: Ponto[] = [
  { id: 'p-1', nome: 'Praça Central', ativo: true },
  { id: 'p-2', nome: 'Terminal Norte', ativo: true },
]

const mockReserva: Reserva = {
  id: 'r-1',
  alunoId: 'aluno-1',
  data: '2024-01-16',
  pontoEscolhido: 'Praça Central',
  criadaEm: {} as never,
}

function makeAlunoSnap(aluno: Aluno = mockAluno) {
  const { id: _id, ...dados } = aluno
  return { exists: () => true, data: () => dados }
}

function makePontosSnap(pontos: Ponto[] = mockPontos) {
  return {
    docs: pontos.map(({ id, ...dados }) => ({ id, data: () => dados })),
  }
}

function setupMocks(reservaAtiva: Reserva | null = null, aluno: Aluno = mockAluno) {
  mockDoc.mockReturnValue('doc-ref')
  mockCollection.mockReturnValue('col-ref')
  mockQuery.mockReturnValue('query-ref')
  mockWhere.mockReturnValue('where-constraint')
  mockGetDoc.mockResolvedValue(makeAlunoSnap(aluno))
  mockGetDocs.mockResolvedValue(makePontosSnap())
  mockBuscarReservaAtiva.mockResolvedValue(reservaAtiva)
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ── Carregamento inicial ───────────────────────────────────────────────────────

describe('useReserva — estado inicial', () => {
  it('começa com carregando=true', () => {
    mockGetDoc.mockReturnValue(new Promise(() => {})) // nunca resolve
    const { result } = renderHook(() => useReserva(AGORA_JANELA_ABERTA))
    expect(result.current.carregando).toBe(true)
  })

  it('começa com aluno=null', () => {
    mockGetDoc.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useReserva(AGORA_JANELA_ABERTA))
    expect(result.current.aluno).toBeNull()
  })
})

// ── Carregamento de dados ─────────────────────────────────────────────────────

describe('useReserva — após carregamento', () => {
  it('popula aluno com dados do Firestore', async () => {
    setupMocks()
    const { result } = renderHook(() => useReserva(AGORA_JANELA_ABERTA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.aluno?.nome).toBe('Luana Beatriz')
    expect(result.current.aluno?.faculdade).toBe('Uninassau')
  })

  it('popula lista de pontos', async () => {
    setupMocks()
    const { result } = renderHook(() => useReserva(AGORA_JANELA_ABERTA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.pontos).toHaveLength(2)
    expect(result.current.pontos[0].nome).toBe('Praça Central')
  })

  it('pré-seleciona o ponto padrão do aluno', async () => {
    setupMocks()
    const { result } = renderHook(() => useReserva(AGORA_JANELA_ABERTA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.pontoSelecionado).toBe('Praça Central')
  })

  it('carrega reserva ativa quando existe', async () => {
    setupMocks(mockReserva)
    const { result } = renderHook(() => useReserva(AGORA_JANELA_ABERTA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.reservaAtiva?.id).toBe('r-1')
  })

  it('reservaAtiva fica null quando não há reserva', async () => {
    setupMocks(null)
    const { result } = renderHook(() => useReserva(AGORA_JANELA_ABERTA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.reservaAtiva).toBeNull()
  })
})

// ── Estado da janela ──────────────────────────────────────────────────────────

describe('useReserva — janelaEstaAberta', () => {
  it('retorna true quando agora=18h', async () => {
    setupMocks()
    const { result } = renderHook(() => useReserva(AGORA_JANELA_ABERTA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.janelaEstaAberta).toBe(true)
  })

  it('retorna false quando agora=14h', async () => {
    setupMocks()
    const { result } = renderHook(() => useReserva(AGORA_JANELA_FECHADA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.janelaEstaAberta).toBe(false)
  })
})

// ── Cancelamento permitido ────────────────────────────────────────────────────

describe('useReserva — cancelamentoEstaPermitido', () => {
  it('retorna true quando há reserva ativa e agora=10h', async () => {
    setupMocks(mockReserva)
    const { result } = renderHook(() => useReserva(AGORA_CANCEL_OK))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.cancelamentoEstaPermitido).toBe(true)
  })

  it('retorna false quando há reserva ativa mas agora=17h (prazo expirado)', async () => {
    setupMocks(mockReserva)
    const { result } = renderHook(() => useReserva(AGORA_CANCEL_EXP))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.cancelamentoEstaPermitido).toBe(false)
  })

  it('retorna false quando não há reserva ativa', async () => {
    setupMocks(null)
    const { result } = renderHook(() => useReserva(AGORA_CANCEL_OK))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.cancelamentoEstaPermitido).toBe(false)
  })
})

// ── confirmarReserva ──────────────────────────────────────────────────────────

describe('useReserva — confirmarReserva', () => {
  it('chama reservaService.criarReserva com os args corretos', async () => {
    setupMocks()
    mockCriarReserva.mockResolvedValue(mockReserva)
    const { result } = renderHook(() => useReserva(AGORA_JANELA_ABERTA))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => { await result.current.confirmarReserva() })

    expect(mockCriarReserva).toHaveBeenCalledWith(
      'aluno-1', 'Praça Central', expect.any(String), AGORA_JANELA_ABERTA
    )
  })

  it('atualiza reservaAtiva após confirmação', async () => {
    setupMocks()
    mockCriarReserva.mockResolvedValue(mockReserva)
    const { result } = renderHook(() => useReserva(AGORA_JANELA_ABERTA))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => { await result.current.confirmarReserva() })

    expect(result.current.reservaAtiva?.id).toBe('r-1')
  })

  it('define erro quando reservaService lança JANELA_FECHADA', async () => {
    setupMocks()
    mockCriarReserva.mockRejectedValue(
      Object.assign(new Error('A janela de reservas está fechada.'), { code: 'reserva/janela-fechada' })
    )
    const { result } = renderHook(() => useReserva(AGORA_JANELA_ABERTA))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => { await result.current.confirmarReserva() })

    expect(result.current.erro).toBe('A janela de reservas está fechada.')
  })

  it('define erro quando reservaService lança ALUNO_SUSPENSO', async () => {
    setupMocks()
    mockCriarReserva.mockRejectedValue(
      Object.assign(new Error('Aluno suspenso não pode fazer reservas.'), { code: 'reserva/aluno-suspenso' })
    )
    const { result } = renderHook(() => useReserva(AGORA_JANELA_ABERTA))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => { await result.current.confirmarReserva() })

    expect(result.current.erro).toBe('Aluno suspenso não pode fazer reservas.')
  })
})

// ── cancelarReserva ───────────────────────────────────────────────────────────

describe('useReserva — cancelarReserva', () => {
  it('chama reservaService.cancelarReserva com id, uid e agora', async () => {
    setupMocks(mockReserva)
    mockCancelarReserva.mockResolvedValue(undefined)
    const { result } = renderHook(() => useReserva(AGORA_CANCEL_OK))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => { await result.current.cancelarReserva() })

    expect(mockCancelarReserva).toHaveBeenCalledWith('r-1', 'aluno-1', AGORA_CANCEL_OK)
  })

  it('limpa reservaAtiva após cancelamento', async () => {
    setupMocks(mockReserva)
    mockCancelarReserva.mockResolvedValue(undefined)
    const { result } = renderHook(() => useReserva(AGORA_CANCEL_OK))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => { await result.current.cancelarReserva() })

    expect(result.current.reservaAtiva).toBeNull()
  })

  it('define erro quando cancelamento está expirado', async () => {
    setupMocks(mockReserva)
    mockCancelarReserva.mockRejectedValue(
      Object.assign(new Error('O prazo para cancelamento expirou.'), { code: 'reserva/cancelamento-expirado' })
    )
    const { result } = renderHook(() => useReserva(AGORA_CANCEL_OK))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => { await result.current.cancelarReserva() })

    expect(result.current.erro).toBe('O prazo para cancelamento expirou.')
  })
})

// ── selecionarPonto ───────────────────────────────────────────────────────────

describe('useReserva — selecionarPonto', () => {
  it('atualiza pontoSelecionado para o ponto escolhido', async () => {
    setupMocks()
    const { result } = renderHook(() => useReserva(AGORA_JANELA_ABERTA))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    act(() => { result.current.selecionarPonto('Terminal Norte') })

    expect(result.current.pontoSelecionado).toBe('Terminal Norte')
  })
})
