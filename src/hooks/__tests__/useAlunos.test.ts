import { renderHook, act, waitFor } from '@testing-library/react'
import { useAlunos } from '@/hooks/useAlunos'
import { StatusAluno, ModalidadeAluno } from '@/types/aluno'
import type { Aluno } from '@/types/aluno'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockBuscarAlunos = jest.fn()
const mockReativarAluno = jest.fn()

jest.mock('@/services/alunoService', () => ({
  alunoService: {
    buscarAlunos: (...args: unknown[]) => mockBuscarAlunos(...args),
    reativarAluno: (...args: unknown[]) => mockReativarAluno(...args),
  },
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ANO_ATUAL = 2026

function makeAluno(overrides: Partial<Aluno> = {}): Aluno {
  return {
    id: 'a1',
    nome: 'Alice Santos',
    cpf: '12345678901',
    telefone: '',
    endereco: '',
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
    ...overrides,
  }
}

const LISTA_MOCK: Aluno[] = [
  makeAluno({ id: 'a1', nome: 'Alice Santos',  status: StatusAluno.Ativo,    anoConclusao: 2027, cpf: '11111111111' }),
  makeAluno({ id: 'a2', nome: 'Bruno Lima',    status: StatusAluno.Suspenso, anoConclusao: 2026, cpf: '22222222222' }),
  makeAluno({ id: 'a3', nome: 'Carla Melo',   status: StatusAluno.Ativo,    anoConclusao: 2026, cpf: '33333333333' }),
]

beforeEach(() => {
  jest.clearAllMocks()
  mockBuscarAlunos.mockResolvedValue(LISTA_MOCK)
  mockReativarAluno.mockResolvedValue(undefined)
})

// ── Estado inicial ─────────────────────────────────────────────────────────────

describe('useAlunos — estado inicial', () => {
  it('começa com carregando=true', () => {
    mockBuscarAlunos.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useAlunos(ANO_ATUAL))
    expect(result.current.carregando).toBe(true)
  })

  it('começa com busca vazia', () => {
    mockBuscarAlunos.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useAlunos(ANO_ATUAL))
    expect(result.current.busca).toBe('')
  })

  it('começa com filtroStatus="todos"', () => {
    mockBuscarAlunos.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useAlunos(ANO_ATUAL))
    expect(result.current.filtroStatus).toBe('todos')
  })

  it('carregando=false e lista populada após carga', async () => {
    const { result } = renderHook(() => useAlunos(ANO_ATUAL))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.alunosFiltrados).toHaveLength(3)
  })

  it('chama buscarAlunos na montagem', async () => {
    renderHook(() => useAlunos(ANO_ATUAL))
    await waitFor(() => expect(mockBuscarAlunos).toHaveBeenCalledTimes(1))
  })

  it('total reflete a lista filtrada', async () => {
    const { result } = renderHook(() => useAlunos(ANO_ATUAL))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.total).toBe(3)
  })
})

// ── Erro ──────────────────────────────────────────────────────────────────────

describe('useAlunos — erro', () => {
  it('seta erro quando buscarAlunos rejeita', async () => {
    mockBuscarAlunos.mockRejectedValue(new Error('Falha de rede'))

    const { result } = renderHook(() => useAlunos(ANO_ATUAL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.erro).toBe('Falha de rede')
    expect(result.current.alunosFiltrados).toHaveLength(0)
  })
})

// ── setBusca ──────────────────────────────────────────────────────────────────

describe('useAlunos — setBusca', () => {
  it('filtra por nome (case-insensitive)', async () => {
    const { result } = renderHook(() => useAlunos(ANO_ATUAL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    act(() => { result.current.setBusca('alice') })

    expect(result.current.alunosFiltrados).toHaveLength(1)
    expect(result.current.alunosFiltrados[0].nome).toBe('Alice Santos')
  })

  it('filtra por CPF', async () => {
    const { result } = renderHook(() => useAlunos(ANO_ATUAL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    act(() => { result.current.setBusca('222') })

    expect(result.current.alunosFiltrados).toHaveLength(1)
    expect(result.current.alunosFiltrados[0].cpf).toBe('22222222222')
  })

  it('retorna todos quando busca é espaço vazio', async () => {
    const { result } = renderHook(() => useAlunos(ANO_ATUAL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    act(() => { result.current.setBusca('  ') })

    expect(result.current.alunosFiltrados).toHaveLength(3)
  })

  it('retorna [] quando busca não corresponde a ninguém', async () => {
    const { result } = renderHook(() => useAlunos(ANO_ATUAL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    act(() => { result.current.setBusca('xyz') })

    expect(result.current.alunosFiltrados).toHaveLength(0)
  })

  it('atualiza o valor de busca no estado', async () => {
    const { result } = renderHook(() => useAlunos(ANO_ATUAL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    act(() => { result.current.setBusca('Bruno') })

    expect(result.current.busca).toBe('Bruno')
  })
})

// ── setFiltroStatus — suspensos ───────────────────────────────────────────────

describe('useAlunos — filtroStatus "suspensos"', () => {
  it('exibe apenas suspensos', async () => {
    const { result } = renderHook(() => useAlunos(ANO_ATUAL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    act(() => { result.current.setFiltroStatus('suspensos') })

    expect(result.current.alunosFiltrados).toHaveLength(1)
    expect(result.current.alunosFiltrados[0].status).toBe(StatusAluno.Suspenso)
  })

  it('atualiza filtroStatus no estado', async () => {
    const { result } = renderHook(() => useAlunos(ANO_ATUAL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    act(() => { result.current.setFiltroStatus('suspensos') })

    expect(result.current.filtroStatus).toBe('suspensos')
  })
})

// ── setFiltroStatus — concluindo ──────────────────────────────────────────────

describe('useAlunos — filtroStatus "concluindo"', () => {
  it('exibe apenas alunos com anoConclusao igual ao anoAtual', async () => {
    const { result } = renderHook(() => useAlunos(ANO_ATUAL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    act(() => { result.current.setFiltroStatus('concluindo') })

    // Bruno (suspenso, 2026) e Carla (ativo, 2026) — Alice é 2027
    expect(result.current.alunosFiltrados).toHaveLength(2)
    expect(result.current.alunosFiltrados.every((a) => a.anoConclusao === ANO_ATUAL)).toBe(true)
  })
})

// ── setFiltroStatus — todos ────────────────────────────────────────────────────

describe('useAlunos — filtroStatus "todos"', () => {
  it('retorna todos após mudar de suspensos para todos', async () => {
    const { result } = renderHook(() => useAlunos(ANO_ATUAL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    act(() => { result.current.setFiltroStatus('suspensos') })
    act(() => { result.current.setFiltroStatus('todos') })

    expect(result.current.alunosFiltrados).toHaveLength(3)
  })
})

// ── Busca + filtro combinados ─────────────────────────────────────────────────

describe('useAlunos — busca e filtro combinados', () => {
  it('aplica filtroStatus e busca simultaneamente', async () => {
    const { result } = renderHook(() => useAlunos(ANO_ATUAL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    // concluindo: Bruno e Carla. Buscando "Carla" → só Carla
    act(() => { result.current.setFiltroStatus('concluindo') })
    act(() => { result.current.setBusca('Carla') })

    expect(result.current.alunosFiltrados).toHaveLength(1)
    expect(result.current.alunosFiltrados[0].nome).toBe('Carla Melo')
  })
})

// ── reativarAluno ─────────────────────────────────────────────────────────────

describe('useAlunos — reativarAluno', () => {
  it('chama alunoService.reativarAluno com o id correto', async () => {
    const { result } = renderHook(() => useAlunos(ANO_ATUAL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.reativarAluno('a2')
    })

    expect(mockReativarAluno).toHaveBeenCalledWith('a2')
  })

  it('recarrega a lista após reativação', async () => {
    const listaAtualizada: Aluno[] = [
      ...LISTA_MOCK.filter((a) => a.id !== 'a2'),
      makeAluno({ id: 'a2', nome: 'Bruno Lima', status: StatusAluno.Ativo, anoConclusao: 2026, cpf: '22222222222' }),
    ]
    mockBuscarAlunos
      .mockResolvedValueOnce(LISTA_MOCK)
      .mockResolvedValueOnce(listaAtualizada)

    const { result } = renderHook(() => useAlunos(ANO_ATUAL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.reativarAluno('a2')
    })

    expect(mockBuscarAlunos).toHaveBeenCalledTimes(2)
  })
})
