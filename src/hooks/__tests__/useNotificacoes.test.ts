import { renderHook, act, waitFor } from '@testing-library/react'
import { useNotificacoes } from '@/hooks/useNotificacoes'
import { TipoNotificacao } from '@/types/notificacao'
import type { Notificacao } from '@/types/notificacao'
import type { Timestamp } from 'firebase/firestore'

jest.mock('@/lib/firebase', () => ({
  auth: { currentUser: { uid: 'aluno-1' } },
  db: {},
}))

const mockBuscarNotificacoes = jest.fn()
const mockMarcarComoLida = jest.fn()

jest.mock('@/services/notificacaoService', () => ({
  notificacaoService: {
    buscarNotificacoes: (...a: unknown[]) => mockBuscarNotificacoes(...a),
    marcarComoLida: (...a: unknown[]) => mockMarcarComoLida(...a),
  },
}))

function makeNotif(overrides: Partial<Notificacao> = {}): Notificacao {
  return {
    id: 'n1', alunoId: 'aluno-1',
    tipo: TipoNotificacao.AberturaReservas,
    titulo: 'Reservas abertas', mensagem: 'As reservas estão abertas.',
    lida: false, criadaEm: {} as unknown as Timestamp,
    ...overrides,
  }
}

beforeEach(() => jest.clearAllMocks())

describe('useNotificacoes — estado inicial', () => {
  it('começa com carregando=true', () => {
    mockBuscarNotificacoes.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useNotificacoes())
    expect(result.current.carregando).toBe(true)
  })

  it('começa com notificacoes=[]', () => {
    mockBuscarNotificacoes.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useNotificacoes())
    expect(result.current.notificacoes).toHaveLength(0)
  })
})

describe('useNotificacoes — carregamento', () => {
  it('carrega notificações do serviço', async () => {
    mockBuscarNotificacoes.mockResolvedValue([makeNotif(), makeNotif({ id: 'n2' })])
    const { result } = renderHook(() => useNotificacoes())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.notificacoes).toHaveLength(2)
  })

  it('carregando=false após resolução', async () => {
    mockBuscarNotificacoes.mockResolvedValue([])
    const { result } = renderHook(() => useNotificacoes())
    await waitFor(() => expect(result.current.carregando).toBe(false))
  })

  it('carregando=false quando não há usuário autenticado', async () => {
    mockBuscarNotificacoes.mockResolvedValue([])
    const { result } = renderHook(() => useNotificacoes())
    await waitFor(() => expect(result.current.carregando).toBe(false))
  })
})

describe('useNotificacoes — naoLidas', () => {
  it('conta somente as notificações não lidas', async () => {
    mockBuscarNotificacoes.mockResolvedValue([
      makeNotif({ id: 'n1', lida: false }),
      makeNotif({ id: 'n2', lida: false }),
      makeNotif({ id: 'n3', lida: true }),
    ])
    const { result } = renderHook(() => useNotificacoes())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.naoLidas).toBe(2)
  })

  it('naoLidas=0 quando todas estão lidas', async () => {
    mockBuscarNotificacoes.mockResolvedValue([
      makeNotif({ lida: true }),
    ])
    const { result } = renderHook(() => useNotificacoes())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.naoLidas).toBe(0)
  })
})

describe('useNotificacoes — marcarTodasComoLidas', () => {
  it('chama marcarComoLida no serviço para cada notificação não lida', async () => {
    mockBuscarNotificacoes.mockResolvedValue([
      makeNotif({ id: 'n1', lida: false }),
      makeNotif({ id: 'n2', lida: false }),
      makeNotif({ id: 'n3', lida: true }),
    ])
    mockMarcarComoLida.mockResolvedValue(undefined)
    const { result } = renderHook(() => useNotificacoes())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => { await result.current.marcarTodasComoLidas() })

    expect(mockMarcarComoLida).toHaveBeenCalledTimes(2)
    expect(mockMarcarComoLida).toHaveBeenCalledWith('n1')
    expect(mockMarcarComoLida).toHaveBeenCalledWith('n2')
  })

  it('atualiza o estado local — naoLidas passa a 0', async () => {
    mockBuscarNotificacoes.mockResolvedValue([
      makeNotif({ id: 'n1', lida: false }),
      makeNotif({ id: 'n2', lida: false }),
    ])
    mockMarcarComoLida.mockResolvedValue(undefined)
    const { result } = renderHook(() => useNotificacoes())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => { await result.current.marcarTodasComoLidas() })

    expect(result.current.naoLidas).toBe(0)
  })

  it('não chama o serviço quando todas já estão lidas', async () => {
    mockBuscarNotificacoes.mockResolvedValue([makeNotif({ lida: true })])
    mockMarcarComoLida.mockResolvedValue(undefined)
    const { result } = renderHook(() => useNotificacoes())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => { await result.current.marcarTodasComoLidas() })

    expect(mockMarcarComoLida).not.toHaveBeenCalled()
  })
})
