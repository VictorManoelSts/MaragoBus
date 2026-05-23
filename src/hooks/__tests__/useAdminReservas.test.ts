import { renderHook, waitFor } from '@testing-library/react'
import { useAdminReservas } from '@/hooks/useAdminReservas'
import { StatusAluno, ModalidadeAluno } from '@/types/aluno'
import type { ReservaAdmin } from '@/services/adminService'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockBuscarReservasDia = jest.fn()

jest.mock('@/services/adminService', () => ({
  adminService: {
    buscarReservasDia: (...args: unknown[]) => mockBuscarReservasDia(...args),
  },
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const AGORA_ANTES_17 = new Date(2026, 4, 23, 9, 0)   // 09h — amanhã indisponível
const AGORA_APOS_17  = new Date(2026, 4, 23, 18, 0)  // 18h — amanhã disponível

function makeReserva(id: string, faculdade: string): ReservaAdmin {
  return {
    reservaId: id,
    aluno: {
      id: `aluno-${id}`,
      nome: `Aluno ${id}`,
      cpf: '00000000000',
      telefone: '',
      endereco: '',
      foto: null,
      faculdade,
      curso: 'Direito',
      modalidade: ModalidadeAluno.Presencial,
      semestre: 1,
      anoConclusao: 2026,
      pontoEmbarquePadrao: 'Ponto A',
      status: StatusAluno.Ativo,
      dataSuspensao: null,
      dataReativacao: null,
      primeiroAcesso: false,
    },
    pontoEscolhido: 'Ponto A',
  }
}

const RESERVAS_HOJE   = [makeReserva('h1', 'UFAL'), makeReserva('h2', 'UNIT')]
const RESERVAS_AMANHA = [makeReserva('a1', 'UFAL')]

beforeEach(() => {
  jest.clearAllMocks()
  mockBuscarReservasDia.mockResolvedValue(RESERVAS_HOJE)
})

// ── Estado inicial ─────────────────────────────────────────────────────────────

describe('useAdminReservas — estado inicial', () => {
  it('começa com carregando=true', () => {
    mockBuscarReservasDia.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useAdminReservas(AGORA_APOS_17))
    expect(result.current.carregando).toBe(true)
  })

  it('começa com aba=hoje', () => {
    mockBuscarReservasDia.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useAdminReservas(AGORA_APOS_17))
    expect(result.current.aba).toBe('hoje')
  })

  it('começa com erro=null', () => {
    mockBuscarReservasDia.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useAdminReservas(AGORA_APOS_17))
    expect(result.current.erro).toBeNull()
  })
})

// ── abaAmanhaDisponivel ────────────────────────────────────────────────────────

describe('useAdminReservas — disponibilidade de amanhã', () => {
  it('abaAmanhaDisponivel=true quando hora >= 17', () => {
    mockBuscarReservasDia.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useAdminReservas(AGORA_APOS_17))
    expect(result.current.abaAmanhaDisponivel).toBe(true)
  })

  it('abaAmanhaDisponivel=false quando hora < 17', () => {
    mockBuscarReservasDia.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useAdminReservas(AGORA_ANTES_17))
    expect(result.current.abaAmanhaDisponivel).toBe(false)
  })

  it('busca reservas de amanhã quando hora >= 17', async () => {
    mockBuscarReservasDia
      .mockResolvedValueOnce(RESERVAS_HOJE)
      .mockResolvedValueOnce(RESERVAS_AMANHA)

    const { result } = renderHook(() => useAdminReservas(AGORA_APOS_17))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(mockBuscarReservasDia).toHaveBeenCalledWith('2026-05-23')
    expect(mockBuscarReservasDia).toHaveBeenCalledWith('2026-05-24')
  })

  it('não busca reservas de amanhã quando hora < 17', async () => {
    const { result } = renderHook(() => useAdminReservas(AGORA_ANTES_17))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(mockBuscarReservasDia).toHaveBeenCalledTimes(1)
    expect(mockBuscarReservasDia).toHaveBeenCalledWith('2026-05-23')
  })
})

// ── Métricas ──────────────────────────────────────────────────────────────────

describe('useAdminReservas — métricas', () => {
  it('metricas.hoje = quantidade de reservas de hoje', async () => {
    mockBuscarReservasDia
      .mockResolvedValueOnce(RESERVAS_HOJE)
      .mockResolvedValueOnce(RESERVAS_AMANHA)

    const { result } = renderHook(() => useAdminReservas(AGORA_APOS_17))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.metricas.hoje).toBe(2)
  })

  it('metricas.amanha = quantidade de reservas de amanhã', async () => {
    mockBuscarReservasDia
      .mockResolvedValueOnce(RESERVAS_HOJE)
      .mockResolvedValueOnce(RESERVAS_AMANHA)

    const { result } = renderHook(() => useAdminReservas(AGORA_APOS_17))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.metricas.amanha).toBe(1)
  })

  it('metricas.total = hoje + amanha', async () => {
    mockBuscarReservasDia
      .mockResolvedValueOnce(RESERVAS_HOJE)
      .mockResolvedValueOnce(RESERVAS_AMANHA)

    const { result } = renderHook(() => useAdminReservas(AGORA_APOS_17))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.metricas.total).toBe(3)
  })

  it('metricas.amanha = 0 quando hora < 17', async () => {
    const { result } = renderHook(() => useAdminReservas(AGORA_ANTES_17))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.metricas.amanha).toBe(0)
  })

  it('metricas.total = apenas hoje quando hora < 17', async () => {
    const { result } = renderHook(() => useAdminReservas(AGORA_ANTES_17))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.metricas.total).toBe(RESERVAS_HOJE.length)
  })
})

// ── Agrupamento ───────────────────────────────────────────────────────────────

describe('useAdminReservas — agrupamento por faculdade', () => {
  it('reservasAgrupadas agrupa por faculdade da aba ativa', async () => {
    const { result } = renderHook(() => useAdminReservas(AGORA_ANTES_17))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.reservasAgrupadas['UFAL']).toHaveLength(1)
    expect(result.current.reservasAgrupadas['UNIT']).toHaveLength(1)
  })

  it('selecionarAba("amanha") muda reservasAgrupadas para as de amanhã', async () => {
    mockBuscarReservasDia
      .mockResolvedValueOnce(RESERVAS_HOJE)
      .mockResolvedValueOnce(RESERVAS_AMANHA)

    const { result } = renderHook(() => useAdminReservas(AGORA_APOS_17))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    result.current.selecionarAba('amanha')

    await waitFor(() => expect(result.current.aba).toBe('amanha'))
    expect(result.current.reservasAgrupadas['UFAL']).toHaveLength(1)
    expect(result.current.reservasAgrupadas['UNIT']).toBeUndefined()
  })
})

// ── Erro ──────────────────────────────────────────────────────────────────────

describe('useAdminReservas — erro', () => {
  it('define erro quando serviço falha', async () => {
    mockBuscarReservasDia.mockRejectedValue(new Error('Falha na rede'))

    const { result } = renderHook(() => useAdminReservas(AGORA_ANTES_17))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.erro).toBe('Falha na rede')
  })

  it('usa mensagem genérica para erros desconhecidos', async () => {
    mockBuscarReservasDia.mockRejectedValue('erro-inesperado')

    const { result } = renderHook(() => useAdminReservas(AGORA_ANTES_17))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(result.current.erro).toBe('Erro ao carregar reservas.')
  })
})
