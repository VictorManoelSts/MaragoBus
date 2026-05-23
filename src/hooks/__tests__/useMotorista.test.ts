import { renderHook, act, waitFor } from '@testing-library/react'
import { useMotorista } from '@/hooks/useMotorista'
import { StatusAluno, ModalidadeAluno } from '@/types/aluno'
import type { AlunoComReserva } from '@/services/motoristaService'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockBuscarAlunosHoje = jest.fn()
const mockBuscarAlunosDiaSeguinte = jest.fn()
const mockSolicitarAdvertencia = jest.fn()

jest.mock('@/services/motoristaService', () => ({
  motoristaService: {
    buscarAlunosHoje: (...args: unknown[]) => mockBuscarAlunosHoje(...args),
    buscarAlunosDiaSeguinte: (...args: unknown[]) => mockBuscarAlunosDiaSeguinte(...args),
    solicitarAdvertencia: (...args: unknown[]) => mockSolicitarAdvertencia(...args),
  },
  MOTORISTA_ERROS: {
    LISTA_DIA_SEGUINTE_INDISPONIVEL: 'motorista/lista-dia-seguinte-indisponivel',
  },
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const AGORA_DISPONIVEL = new Date(2024, 2, 1, 8, 0)    // 08h → amanhã liberado
const AGORA_INDISPONIVEL = new Date(2024, 2, 1, 3, 0)  // 03h → amanhã bloqueado

function makeAluno(id: string, faculdade: string, ponto: string): AlunoComReserva {
  return {
    reservaId: `r-${id}`,
    aluno: {
      id,
      nome: `Aluno ${id}`,
      cpf: `0000000000${id}`,
      telefone: '',
      endereco: '',
      foto: null,
      faculdade,
      curso: 'Computação',
      modalidade: ModalidadeAluno.Presencial,
      semestre: 1,
      anoConclusao: 2026,
      pontoEmbarquePadrao: ponto,
      status: StatusAluno.Ativo,
      dataSuspensao: null,
      dataReativacao: null,
      primeiroAcesso: false,
    },
    pontoEscolhido: ponto,
  }
}

const LISTA_MOCK: AlunoComReserva[] = [
  makeAluno('a1', 'UFAL', 'Ponto Central'),
  makeAluno('a2', 'UNIT', 'Ponto Norte'),
  makeAluno('a3', 'UFAL', 'Ponto Norte'),
]

const ERRO_BLOQUEADO = Object.assign(
  new Error('Indisponível antes das 5h'),
  { code: 'motorista/lista-dia-seguinte-indisponivel' }
)

beforeEach(() => {
  jest.clearAllMocks()
  mockBuscarAlunosHoje.mockResolvedValue(LISTA_MOCK)
  mockBuscarAlunosDiaSeguinte.mockResolvedValue(LISTA_MOCK)
})

// ── Estado inicial ─────────────────────────────────────────────────────────────

describe('useMotorista — estado inicial', () => {
  it('começa com carregando=true', () => {
    mockBuscarAlunosHoje.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useMotorista(AGORA_DISPONIVEL))
    expect(result.current.carregando).toBe(true)
  })

  it('começa com aba=hoje', () => {
    mockBuscarAlunosHoje.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useMotorista(AGORA_DISPONIVEL))
    expect(result.current.aba).toBe('hoje')
  })

  it('começa com alunos vazio', () => {
    mockBuscarAlunosHoje.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useMotorista(AGORA_DISPONIVEL))
    expect(result.current.alunos).toHaveLength(0)
  })

  it('carregando=false e alunos populados após carga', async () => {
    const { result } = renderHook(() => useMotorista(AGORA_DISPONIVEL))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.alunos).toHaveLength(3)
  })

  it('chama buscarAlunosHoje na montagem', async () => {
    renderHook(() => useMotorista(AGORA_DISPONIVEL))
    await waitFor(() => expect(mockBuscarAlunosHoje).toHaveBeenCalledTimes(1))
  })
})

// ── total ─────────────────────────────────────────────────────────────────────

describe('useMotorista — total', () => {
  it('retorna o total de alunos na lista filtrada', async () => {
    const { result } = renderHook(() => useMotorista(AGORA_DISPONIVEL))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.total).toBe(3)
  })
})

// ── faculdadesDisponiveis e pontosDisponiveis ─────────────────────────────────

describe('useMotorista — valores disponíveis para filtros', () => {
  it('retorna faculdades únicas ordenadas', async () => {
    const { result } = renderHook(() => useMotorista(AGORA_DISPONIVEL))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.faculdadesDisponiveis).toEqual(['UFAL', 'UNIT'])
  })

  it('retorna pontos únicos ordenados', async () => {
    const { result } = renderHook(() => useMotorista(AGORA_DISPONIVEL))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.pontosDisponiveis).toEqual(['Ponto Central', 'Ponto Norte'])
  })
})

// ── alunosAgrupados ───────────────────────────────────────────────────────────

describe('useMotorista — alunosAgrupados', () => {
  it('agrupa alunos por faculdade', async () => {
    const { result } = renderHook(() => useMotorista(AGORA_DISPONIVEL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    const grupos = result.current.alunosAgrupados
    expect(Object.keys(grupos)).toEqual(expect.arrayContaining(['UFAL', 'UNIT']))
    expect(grupos['UFAL']).toHaveLength(2)
    expect(grupos['UNIT']).toHaveLength(1)
  })
})

// ── filtros ───────────────────────────────────────────────────────────────────

describe('useMotorista — toggleFaculdade', () => {
  it('filtra a lista ao selecionar uma faculdade', async () => {
    const { result } = renderHook(() => useMotorista(AGORA_DISPONIVEL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    act(() => { result.current.toggleFaculdade('UFAL') })

    expect(result.current.alunos).toHaveLength(2)
    expect(result.current.alunos.every((a) => a.aluno.faculdade === 'UFAL')).toBe(true)
  })

  it('remove o filtro ao clicar na faculdade já selecionada', async () => {
    const { result } = renderHook(() => useMotorista(AGORA_DISPONIVEL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    act(() => { result.current.toggleFaculdade('UFAL') })
    act(() => { result.current.toggleFaculdade('UFAL') })

    expect(result.current.alunos).toHaveLength(3)
  })

  it('atualiza total após filtro de faculdade', async () => {
    const { result } = renderHook(() => useMotorista(AGORA_DISPONIVEL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    act(() => { result.current.toggleFaculdade('UNIT') })

    expect(result.current.total).toBe(1)
  })
})

describe('useMotorista — togglePonto', () => {
  it('filtra a lista ao selecionar um ponto', async () => {
    const { result } = renderHook(() => useMotorista(AGORA_DISPONIVEL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    act(() => { result.current.togglePonto('Ponto Norte') })

    expect(result.current.alunos).toHaveLength(2)
    expect(result.current.alunos.every((a) => a.pontoEscolhido === 'Ponto Norte')).toBe(true)
  })

  it('remove o filtro ao clicar no ponto já selecionado', async () => {
    const { result } = renderHook(() => useMotorista(AGORA_DISPONIVEL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    act(() => { result.current.togglePonto('Ponto Norte') })
    act(() => { result.current.togglePonto('Ponto Norte') })

    expect(result.current.alunos).toHaveLength(3)
  })
})

// ── selecionarAba ─────────────────────────────────────────────────────────────

describe('useMotorista — selecionarAba', () => {
  it('chama buscarAlunosDiaSeguinte ao mudar para amanhã', async () => {
    const { result } = renderHook(() => useMotorista(AGORA_DISPONIVEL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    act(() => { result.current.selecionarAba('amanha') })

    await waitFor(() => expect(mockBuscarAlunosDiaSeguinte).toHaveBeenCalledTimes(1))
  })

  it('muda aba para amanha', async () => {
    const { result } = renderHook(() => useMotorista(AGORA_DISPONIVEL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    act(() => { result.current.selecionarAba('amanha') })

    expect(result.current.aba).toBe('amanha')
  })

  it('seta abaAmanhaBloqueada=true quando serviço lança LISTA_DIA_SEGUINTE_INDISPONIVEL', async () => {
    mockBuscarAlunosDiaSeguinte.mockRejectedValue(ERRO_BLOQUEADO)

    const { result } = renderHook(() => useMotorista(AGORA_INDISPONIVEL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    act(() => { result.current.selecionarAba('amanha') })
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.abaAmanhaBloqueada).toBe(true)
    expect(result.current.alunos).toHaveLength(0)
  })

  it('define erro quando serviço falha por motivo inesperado', async () => {
    mockBuscarAlunosHoje.mockRejectedValue(new Error('Falha de rede'))

    const { result } = renderHook(() => useMotorista(AGORA_DISPONIVEL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.erro).toBe('Falha de rede')
  })
})

// ── solicitarAdvertencia ──────────────────────────────────────────────────────

describe('useMotorista — solicitarAdvertencia', () => {
  it('delega ao motoristaService com alunoId e motivo', async () => {
    mockSolicitarAdvertencia.mockResolvedValue(undefined)

    const { result } = renderHook(() => useMotorista(AGORA_DISPONIVEL))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.solicitarAdvertencia('aluno-x', 'Não compareceu')
    })

    expect(mockSolicitarAdvertencia).toHaveBeenCalledWith('aluno-x', 'Não compareceu')
  })
})
