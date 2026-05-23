import { renderHook, waitFor } from '@testing-library/react'
import { useDetalheAluno } from '@/hooks/useDetalheAluno'
import { StatusAluno, ModalidadeAluno } from '@/types/aluno'
import type { Aluno } from '@/types/aluno'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockBuscarDetalheAluno = jest.fn()

jest.mock('@/services/motoristaService', () => ({
  motoristaService: {
    buscarAlunosHoje: jest.fn(),
    buscarAlunosDiaSeguinte: jest.fn(),
    solicitarAdvertencia: jest.fn(),
    buscarDetalheAluno: (...args: unknown[]) => mockBuscarDetalheAluno(...args),
  },
  MOTORISTA_ERROS: {
    LISTA_DIA_SEGUINTE_INDISPONIVEL: 'motorista/lista-dia-seguinte-indisponivel',
  },
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ALUNO_FIXTURE: Aluno = {
  id: 'aluno-1',
  nome: 'Luana Beatriz',
  cpf: '12345678901',
  telefone: '(82) 99999-1111',
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

const AGORA = new Date(2026, 4, 23, 8, 0)

beforeEach(() => {
  jest.clearAllMocks()
  mockBuscarDetalheAluno.mockResolvedValue({
    aluno: ALUNO_FIXTURE,
    pontoEscolhido: 'Ponto Central',
  })
})

// ── Estado inicial ─────────────────────────────────────────────────────────────

describe('useDetalheAluno — estado inicial', () => {
  it('começa com carregando=true', () => {
    mockBuscarDetalheAluno.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useDetalheAluno('aluno-1', AGORA))
    expect(result.current.carregando).toBe(true)
  })

  it('começa com aluno=null', () => {
    mockBuscarDetalheAluno.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useDetalheAluno('aluno-1', AGORA))
    expect(result.current.aluno).toBeNull()
  })

  it('começa com erro=null', () => {
    mockBuscarDetalheAluno.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useDetalheAluno('aluno-1', AGORA))
    expect(result.current.erro).toBeNull()
  })
})

// ── Carregamento com sucesso ───────────────────────────────────────────────────

describe('useDetalheAluno — carregamento com sucesso', () => {
  it('expõe o aluno após carregamento', async () => {
    const { result } = renderHook(() => useDetalheAluno('aluno-1', AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.aluno).toMatchObject({ id: 'aluno-1', nome: 'Luana Beatriz' })
  })

  it('expõe o pontoEscolhido após carregamento', async () => {
    const { result } = renderHook(() => useDetalheAluno('aluno-1', AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.pontoEscolhido).toBe('Ponto Central')
  })

  it('expõe pontoEscolhido null quando sem reserva', async () => {
    mockBuscarDetalheAluno.mockResolvedValue({ aluno: ALUNO_FIXTURE, pontoEscolhido: null })
    const { result } = renderHook(() => useDetalheAluno('aluno-1', AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.pontoEscolhido).toBeNull()
  })

  it('define carregando=false após sucesso', async () => {
    const { result } = renderHook(() => useDetalheAluno('aluno-1', AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.erro).toBeNull()
  })

  it('chama buscarDetalheAluno com o alunoId correto', async () => {
    const { result } = renderHook(() => useDetalheAluno('aluno-42', AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(mockBuscarDetalheAluno).toHaveBeenCalledWith('aluno-42', AGORA)
  })
})

// ── Erro ──────────────────────────────────────────────────────────────────────

describe('useDetalheAluno — erro', () => {
  it('define erro quando serviço falha', async () => {
    mockBuscarDetalheAluno.mockRejectedValue(new Error('Aluno não encontrado.'))
    const { result } = renderHook(() => useDetalheAluno('inexistente', AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.erro).toBe('Aluno não encontrado.')
  })

  it('define aluno=null quando há erro', async () => {
    mockBuscarDetalheAluno.mockRejectedValue(new Error('Falha'))
    const { result } = renderHook(() => useDetalheAluno('inexistente', AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.aluno).toBeNull()
  })

  it('usa mensagem genérica para erros desconhecidos', async () => {
    mockBuscarDetalheAluno.mockRejectedValue('erro-inesperado')
    const { result } = renderHook(() => useDetalheAluno('aluno-1', AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.erro).toBe('Erro ao carregar aluno.')
  })
})
