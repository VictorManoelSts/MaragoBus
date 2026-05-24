import { renderHook, act, waitFor } from '@testing-library/react'
import { useSolicitacoes } from '@/hooks/useSolicitacoes'
import type { SolicitacaoComDetalhes } from '@/services/adminService'
import type { Timestamp } from 'firebase/firestore'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockBuscarSolicitacoesPendentes = jest.fn()
const mockConfirmarSolicitacao = jest.fn()
const mockRejeitarSolicitacao = jest.fn()

jest.mock('@/services/adminService', () => ({
  adminService: {
    buscarSolicitacoesPendentes: (...args: unknown[]) => mockBuscarSolicitacoesPendentes(...args),
    confirmarSolicitacao:        (...args: unknown[]) => mockConfirmarSolicitacao(...args),
    rejeitarSolicitacao:         (...args: unknown[]) => mockRejeitarSolicitacao(...args),
    buscarReservasDia:   jest.fn(),
    buscarDetalheAluno:  jest.fn(),
    suspenderAluno:      jest.fn(),
    excluirAluno:        jest.fn(),
    editarAluno:         jest.fn(),
    buscarPontos:        jest.fn(),
    cadastrarAluno:      jest.fn(),
  },
}))

jest.mock('@/lib/firebase', () => ({ auth: {} }))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TIMESTAMP_FIXTURE = { toDate: () => new Date('2026-05-20') } as unknown as Timestamp

function makeSolicitacao(overrides: Partial<SolicitacaoComDetalhes> = {}): SolicitacaoComDetalhes {
  return {
    id: 's1',
    alunoId: 'a1',
    motoristaId: 'm1',
    nomeAluno: 'Alice Santos',
    nomeMotorista: 'Carlos Silva',
    motivo: 'Faltou ao embarque',
    data: TIMESTAMP_FIXTURE,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockBuscarSolicitacoesPendentes.mockResolvedValue([makeSolicitacao()])
  mockConfirmarSolicitacao.mockResolvedValue(undefined)
  mockRejeitarSolicitacao.mockResolvedValue(undefined)
})

// ── Estado inicial ────────────────────────────────────────────────────────────

describe('useSolicitacoes — estado inicial', () => {
  it('começa com solicitacoes=[]', () => {
    mockBuscarSolicitacoesPendentes.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useSolicitacoes())
    expect(result.current.solicitacoes).toEqual([])
  })

  it('começa com carregando=true', () => {
    mockBuscarSolicitacoesPendentes.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useSolicitacoes())
    expect(result.current.carregando).toBe(true)
  })

  it('chama buscarSolicitacoesPendentes ao montar', async () => {
    const { result } = renderHook(() => useSolicitacoes())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(mockBuscarSolicitacoesPendentes).toHaveBeenCalledTimes(1)
  })
})

// ── Carregamento ──────────────────────────────────────────────────────────────

describe('useSolicitacoes — carregamento', () => {
  it('popula solicitacoes após carregar', async () => {
    const { result } = renderHook(() => useSolicitacoes())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.solicitacoes).toHaveLength(1)
  })

  it('carregando fica false após carregar', async () => {
    const { result } = renderHook(() => useSolicitacoes())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.carregando).toBe(false)
  })

  it('solicitacoes fica [] se buscarSolicitacoesPendentes falha', async () => {
    mockBuscarSolicitacoesPendentes.mockRejectedValue(new Error('Falha'))
    const { result } = renderHook(() => useSolicitacoes())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.solicitacoes).toEqual([])
  })
})

// ── confirmar ─────────────────────────────────────────────────────────────────

describe('useSolicitacoes — confirmar', () => {
  it('chama adminService.confirmarSolicitacao com os parâmetros corretos', async () => {
    const { result } = renderHook(() => useSolicitacoes())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.confirmar('s1', 'a1', 'Faltou', 'Justificativa admin')
    })

    expect(mockConfirmarSolicitacao).toHaveBeenCalledWith('s1', 'a1', 'Faltou', 'Justificativa admin')
  })

  it('remove a solicitação da lista após confirmar', async () => {
    const { result } = renderHook(() => useSolicitacoes())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.confirmar('s1', 'a1', 'Faltou', 'Justificativa')
    })

    expect(result.current.solicitacoes).toHaveLength(0)
  })

  it('propaga erro quando confirmarSolicitacao falha', async () => {
    mockConfirmarSolicitacao.mockRejectedValue(new Error('Erro ao confirmar'))
    const { result } = renderHook(() => useSolicitacoes())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await expect(
      act(async () => { await result.current.confirmar('s1', 'a1', 'Faltou', 'Just') })
    ).rejects.toThrow('Erro ao confirmar')
  })

  it('não remove a solicitação se confirmarSolicitacao falha', async () => {
    mockConfirmarSolicitacao.mockRejectedValue(new Error('Erro'))
    const { result } = renderHook(() => useSolicitacoes())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.confirmar('s1', 'a1', 'Faltou', 'Just').catch(() => {})
    })

    expect(result.current.solicitacoes).toHaveLength(1)
  })
})

// ── rejeitar ──────────────────────────────────────────────────────────────────

describe('useSolicitacoes — rejeitar', () => {
  it('chama adminService.rejeitarSolicitacao com os parâmetros corretos', async () => {
    const { result } = renderHook(() => useSolicitacoes())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.rejeitar('s1', 'Motivo insuficiente')
    })

    expect(mockRejeitarSolicitacao).toHaveBeenCalledWith('s1', 'Motivo insuficiente')
  })

  it('remove a solicitação da lista após rejeitar', async () => {
    const { result } = renderHook(() => useSolicitacoes())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.rejeitar('s1', 'Motivo insuficiente')
    })

    expect(result.current.solicitacoes).toHaveLength(0)
  })

  it('propaga erro quando rejeitarSolicitacao falha', async () => {
    mockRejeitarSolicitacao.mockRejectedValue(new Error('Erro ao rejeitar'))
    const { result } = renderHook(() => useSolicitacoes())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await expect(
      act(async () => { await result.current.rejeitar('s1', 'Just') })
    ).rejects.toThrow('Erro ao rejeitar')
  })

  it('não remove a solicitação se rejeitarSolicitacao falha', async () => {
    mockRejeitarSolicitacao.mockRejectedValue(new Error('Erro'))
    const { result } = renderHook(() => useSolicitacoes())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.rejeitar('s1', 'Just').catch(() => {})
    })

    expect(result.current.solicitacoes).toHaveLength(1)
  })
})
