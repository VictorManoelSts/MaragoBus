import { renderHook, act, waitFor } from '@testing-library/react'
import { useFeriados } from '@/hooks/useFeriados'
import { TipoFeriado } from '@/types/feriado'
import type { Feriado } from '@/types/feriado'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSincronizarNacionais = jest.fn()
const mockBuscarFeriados = jest.fn()
const mockAdicionarFeriado = jest.fn()
const mockRemoverFeriado = jest.fn()
const mockVerificarAvisos = jest.fn()

jest.mock('@/services/feriadoService', () => ({
  feriadoService: {
    sincronizarNacionais: (...args: unknown[]) => mockSincronizarNacionais(...args),
    buscarFeriados:        (...args: unknown[]) => mockBuscarFeriados(...args),
    adicionarFeriado:      (...args: unknown[]) => mockAdicionarFeriado(...args),
    removerFeriado:        (...args: unknown[]) => mockRemoverFeriado(...args),
    verificarAvisos:       (...args: unknown[]) => mockVerificarAvisos(...args),
  },
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const AGORA = new Date(2026, 4, 24, 10, 0) // 24/05/2026 10h

function makeFeriado(id: string, data: string, tipo: TipoFeriado = TipoFeriado.Nacional): Feriado {
  return { id, data, nome: `Feriado ${id}`, tipo }
}

const FERIADOS: Feriado[] = [
  makeFeriado('f1', '2026-01-01'),
  makeFeriado('f2', '2026-06-24', TipoFeriado.Regional),
]

beforeEach(() => {
  jest.clearAllMocks()
  mockSincronizarNacionais.mockResolvedValue(undefined)
  mockBuscarFeriados.mockResolvedValue(FERIADOS)
  mockAdicionarFeriado.mockResolvedValue('novo-id')
  mockRemoverFeriado.mockResolvedValue(undefined)
  mockVerificarAvisos.mockReturnValue([])
})

// ── Estado inicial ────────────────────────────────────────────────────────────

describe('useFeriados — estado inicial', () => {
  it('começa com carregando=true', () => {
    mockSincronizarNacionais.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useFeriados(AGORA))
    expect(result.current.carregando).toBe(true)
  })

  it('começa com feriados=[]', () => {
    mockSincronizarNacionais.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useFeriados(AGORA))
    expect(result.current.feriados).toEqual([])
  })

  it('começa com erro=null', () => {
    mockSincronizarNacionais.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useFeriados(AGORA))
    expect(result.current.erro).toBeNull()
  })
})

// ── Carregamento ──────────────────────────────────────────────────────────────

describe('useFeriados — carregamento', () => {
  it('sincroniza nacionais com o ano de agora', async () => {
    const { result } = renderHook(() => useFeriados(AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(mockSincronizarNacionais).toHaveBeenCalledWith(2026)
  })

  it('busca feriados do Firestore com o ano de agora', async () => {
    const { result } = renderHook(() => useFeriados(AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(mockBuscarFeriados).toHaveBeenCalledWith(2026)
  })

  it('popula feriados após carregar', async () => {
    const { result } = renderHook(() => useFeriados(AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.feriados).toEqual(FERIADOS)
  })

  it('carregando volta para false após carregar', async () => {
    const { result } = renderHook(() => useFeriados(AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
  })
})

// ── Erro ──────────────────────────────────────────────────────────────────────

describe('useFeriados — erro', () => {
  it('define erro quando buscarFeriados falha', async () => {
    mockBuscarFeriados.mockRejectedValue(new Error('Sem conexão'))
    const { result } = renderHook(() => useFeriados(AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.erro).toBe('Sem conexão')
  })

  it('usa mensagem genérica para erros desconhecidos', async () => {
    mockBuscarFeriados.mockRejectedValue('erro-inesperado')
    const { result } = renderHook(() => useFeriados(AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.erro).toBe('Erro ao carregar feriados.')
  })

  it('define erro quando sincronizarNacionais falha', async () => {
    mockSincronizarNacionais.mockRejectedValue(new Error('BrasilAPI indisponível'))
    const { result } = renderHook(() => useFeriados(AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.erro).toBe('BrasilAPI indisponível')
  })
})

// ── adicionar ─────────────────────────────────────────────────────────────────

describe('useFeriados — adicionar', () => {
  it('chama adicionarFeriado com os parâmetros corretos', async () => {
    const { result } = renderHook(() => useFeriados(AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.adicionar('2026-06-24', 'São João', TipoFeriado.Regional)
    })

    expect(mockAdicionarFeriado).toHaveBeenCalledWith('2026-06-24', 'São João', TipoFeriado.Regional)
  })

  it('adiciona o novo feriado à lista local', async () => {
    mockAdicionarFeriado.mockResolvedValue('f-novo')
    const { result } = renderHook(() => useFeriados(AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.adicionar('2026-06-24', 'São João', TipoFeriado.Regional)
    })

    expect(result.current.feriados.some(f => f.id === 'f-novo')).toBe(true)
  })

  it('ordena a lista por data após adicionar', async () => {
    mockAdicionarFeriado.mockResolvedValue('f-novo')
    const { result } = renderHook(() => useFeriados(AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.adicionar('2026-03-10', 'Carnaval', TipoFeriado.Avulso)
    })

    const datas = result.current.feriados.map(f => f.data)
    expect(datas).toEqual([...datas].sort())
  })

  it('lança erro quando adicionarFeriado falha', async () => {
    mockAdicionarFeriado.mockRejectedValue(new Error('Falha ao salvar'))
    const { result } = renderHook(() => useFeriados(AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await expect(
      act(async () => {
        await result.current.adicionar('2026-06-24', 'São João', TipoFeriado.Regional)
      })
    ).rejects.toThrow('Falha ao salvar')
  })
})

// ── remover ───────────────────────────────────────────────────────────────────

describe('useFeriados — remover', () => {
  it('chama removerFeriado com o ID correto', async () => {
    const { result } = renderHook(() => useFeriados(AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.remover('f1')
    })

    expect(mockRemoverFeriado).toHaveBeenCalledWith('f1')
  })

  it('remove feriado da lista local', async () => {
    const { result } = renderHook(() => useFeriados(AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.remover('f1')
    })

    expect(result.current.feriados.some(f => f.id === 'f1')).toBe(false)
  })

  it('lança erro quando removerFeriado falha', async () => {
    mockRemoverFeriado.mockRejectedValue(new Error('Falha ao remover'))
    const { result } = renderHook(() => useFeriados(AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await expect(
      act(async () => {
        await result.current.remover('f1')
      })
    ).rejects.toThrow('Falha ao remover')
  })
})

// ── avisos ────────────────────────────────────────────────────────────────────

describe('useFeriados — avisos', () => {
  it('chama verificarAvisos com os feriados carregados e agora', async () => {
    const { result } = renderHook(() => useFeriados(AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(mockVerificarAvisos).toHaveBeenCalledWith(FERIADOS, AGORA)
  })

  it('avisos reflete o retorno de verificarAvisos', async () => {
    const feriadoAviso = makeFeriado('f-aviso', '2026-05-27')
    mockVerificarAvisos.mockReturnValue([feriadoAviso])

    const { result } = renderHook(() => useFeriados(AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.avisos).toEqual([feriadoAviso])
  })

  it('avisos é [] quando verificarAvisos retorna []', async () => {
    mockVerificarAvisos.mockReturnValue([])
    const { result } = renderHook(() => useFeriados(AGORA))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.avisos).toEqual([])
  })
})
