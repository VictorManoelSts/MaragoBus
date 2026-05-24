import { renderHook, act, waitFor } from '@testing-library/react'
import { usePontos } from '@/hooks/usePontos'
import type { Ponto } from '@/types/ponto'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockBuscarPontos   = jest.fn()
const mockAdicionarPonto = jest.fn()
const mockEditarPonto    = jest.fn()
const mockRemoverPonto   = jest.fn()

jest.mock('@/services/adminService', () => ({
  adminService: {
    buscarPontos:   (...args: unknown[]) => mockBuscarPontos(...args),
    adicionarPonto: (...args: unknown[]) => mockAdicionarPonto(...args),
    editarPonto:    (...args: unknown[]) => mockEditarPonto(...args),
    removerPonto:   (...args: unknown[]) => mockRemoverPonto(...args),
  },
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PONTOS: Ponto[] = [
  { id: 'p1', nome: 'Praça Central', ativo: true },
  { id: 'p2', nome: 'Terminal Rodoviário', ativo: true },
]

beforeEach(() => {
  jest.clearAllMocks()
  mockBuscarPontos.mockResolvedValue(PONTOS)
  mockAdicionarPonto.mockResolvedValue('p-novo')
  mockEditarPonto.mockResolvedValue(undefined)
  mockRemoverPonto.mockResolvedValue(undefined)
})

// ── Estado inicial ────────────────────────────────────────────────────────────

describe('usePontos — estado inicial', () => {
  it('começa com carregando=true', () => {
    mockBuscarPontos.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePontos())
    expect(result.current.carregando).toBe(true)
  })

  it('começa com pontos=[]', () => {
    mockBuscarPontos.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePontos())
    expect(result.current.pontos).toEqual([])
  })

  it('começa com erro=null', () => {
    mockBuscarPontos.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePontos())
    expect(result.current.erro).toBeNull()
  })
})

// ── Carregamento ──────────────────────────────────────────────────────────────

describe('usePontos — carregamento', () => {
  it('chama buscarPontos ao montar', async () => {
    const { result } = renderHook(() => usePontos())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(mockBuscarPontos).toHaveBeenCalledTimes(1)
  })

  it('popula pontos após carregar', async () => {
    const { result } = renderHook(() => usePontos())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.pontos).toEqual(PONTOS)
  })

  it('carregando volta para false após carregar', async () => {
    const { result } = renderHook(() => usePontos())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.carregando).toBe(false)
  })
})

// ── Erro ──────────────────────────────────────────────────────────────────────

describe('usePontos — erro', () => {
  it('define erro quando buscarPontos falha', async () => {
    mockBuscarPontos.mockRejectedValue(new Error('Sem conexão'))
    const { result } = renderHook(() => usePontos())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.erro).toBe('Sem conexão')
  })

  it('usa mensagem genérica para erros desconhecidos', async () => {
    mockBuscarPontos.mockRejectedValue('erro-inesperado')
    const { result } = renderHook(() => usePontos())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.erro).toBe('Erro ao carregar pontos.')
  })
})

// ── adicionar ─────────────────────────────────────────────────────────────────

describe('usePontos — adicionar', () => {
  it('chama adicionarPonto com o nome correto', async () => {
    const { result } = renderHook(() => usePontos())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.adicionar('Novo Ponto')
    })

    expect(mockAdicionarPonto).toHaveBeenCalledWith('Novo Ponto')
  })

  it('adiciona o ponto à lista local com id retornado', async () => {
    mockAdicionarPonto.mockResolvedValue('p-novo')
    const { result } = renderHook(() => usePontos())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.adicionar('Novo Ponto')
    })

    expect(result.current.pontos.some(p => p.id === 'p-novo')).toBe(true)
  })

  it('ponto adicionado fica com ativo:true', async () => {
    const { result } = renderHook(() => usePontos())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.adicionar('Novo Ponto')
    })

    const novo = result.current.pontos.find(p => p.id === 'p-novo')
    expect(novo?.ativo).toBe(true)
  })

  it('lança erro quando adicionarPonto falha', async () => {
    mockAdicionarPonto.mockRejectedValue(new Error('Falha ao salvar'))
    const { result } = renderHook(() => usePontos())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await expect(
      act(async () => { await result.current.adicionar('Novo Ponto') })
    ).rejects.toThrow('Falha ao salvar')
  })
})

// ── editar ────────────────────────────────────────────────────────────────────

describe('usePontos — editar', () => {
  it('chama editarPonto com id e novo nome', async () => {
    const { result } = renderHook(() => usePontos())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.editar('p1', 'Praça Nova')
    })

    expect(mockEditarPonto).toHaveBeenCalledWith('p1', 'Praça Nova')
  })

  it('atualiza o nome do ponto na lista local', async () => {
    const { result } = renderHook(() => usePontos())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.editar('p1', 'Praça Nova')
    })

    expect(result.current.pontos.find(p => p.id === 'p1')?.nome).toBe('Praça Nova')
  })

  it('não altera outros pontos ao editar', async () => {
    const { result } = renderHook(() => usePontos())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.editar('p1', 'Praça Nova')
    })

    expect(result.current.pontos.find(p => p.id === 'p2')?.nome).toBe('Terminal Rodoviário')
  })

  it('lança erro quando editarPonto falha', async () => {
    mockEditarPonto.mockRejectedValue(new Error('Falha ao editar'))
    const { result } = renderHook(() => usePontos())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await expect(
      act(async () => { await result.current.editar('p1', 'Praça Nova') })
    ).rejects.toThrow('Falha ao editar')
  })
})

// ── remover ───────────────────────────────────────────────────────────────────

describe('usePontos — remover', () => {
  it('chama removerPonto com id e nome', async () => {
    const { result } = renderHook(() => usePontos())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.remover('p1', 'Praça Central')
    })

    expect(mockRemoverPonto).toHaveBeenCalledWith('p1', 'Praça Central')
  })

  it('remove o ponto da lista local após sucesso', async () => {
    const { result } = renderHook(() => usePontos())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.remover('p1', 'Praça Central')
    })

    expect(result.current.pontos.some(p => p.id === 'p1')).toBe(false)
  })

  it('não remove outros pontos da lista', async () => {
    const { result } = renderHook(() => usePontos())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.remover('p1', 'Praça Central')
    })

    expect(result.current.pontos.some(p => p.id === 'p2')).toBe(true)
  })

  it('lança erro quando removerPonto falha (ponto em uso)', async () => {
    mockRemoverPonto.mockRejectedValue(
      new Error('Ponto em uso. Existem alunos com este ponto como padrão.')
    )
    const { result } = renderHook(() => usePontos())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await expect(
      act(async () => { await result.current.remover('p1', 'Praça Central') })
    ).rejects.toThrow('Ponto em uso.')
  })

  it('não remove ponto da lista quando removerPonto lança erro', async () => {
    mockRemoverPonto.mockRejectedValue(new Error('Ponto em uso.'))
    const { result } = renderHook(() => usePontos())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.remover('p1', 'Praça Central').catch(() => {})
    })

    expect(result.current.pontos.some(p => p.id === 'p1')).toBe(true)
  })
})
