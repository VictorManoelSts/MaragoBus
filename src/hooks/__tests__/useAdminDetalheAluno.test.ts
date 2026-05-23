import { renderHook, act, waitFor } from '@testing-library/react'
import { useAdminDetalheAluno } from '@/hooks/useAdminDetalheAluno'
import { StatusAluno, ModalidadeAluno } from '@/types/aluno'
import { TipoAdvertencia } from '@/types/advertencia'
import type { Aluno } from '@/types/aluno'
import type { Advertencia } from '@/types/advertencia'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockBuscarDetalheAluno = jest.fn()
const mockSuspenderAluno = jest.fn()
const mockExcluirAluno = jest.fn()

jest.mock('@/services/adminService', () => ({
  adminService: {
    buscarReservasDia:   jest.fn(),
    buscarDetalheAluno:  (...args: unknown[]) => mockBuscarDetalheAluno(...args),
    suspenderAluno:      (...args: unknown[]) => mockSuspenderAluno(...args),
    excluirAluno:        (...args: unknown[]) => mockExcluirAluno(...args),
  },
}))

const mockReativarAluno = jest.fn()

jest.mock('@/services/alunoService', () => ({
  alunoService: {
    buscarAlunos:   jest.fn(),
    reativarAluno:  (...args: unknown[]) => mockReativarAluno(...args),
  },
}))

const mockAplicarAdvertencia = jest.fn()

jest.mock('@/services/advertenciaService', () => ({
  advertenciaService: {
    buscarAdvertencias:    jest.fn(),
    aplicarAdvertencia:    (...args: unknown[]) => mockAplicarAdvertencia(...args),
  },
}))

jest.mock('@/lib/firebase', () => ({ auth: { currentUser: { uid: 'admin-uid' } } }))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ALUNO_FIXTURE: Aluno = {
  id: 'a1',
  nome: 'Alice Santos',
  cpf: '12345678901',
  telefone: '(82) 99999-0000',
  endereco: 'Rua A, 100',
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
}

const ADV_FIXTURE: Advertencia = {
  id: 'adv-1',
  alunoId: 'a1',
  motivo: 'Falta injustificada',
  aplicadaPor: 'admin-uid',
  tipo: TipoAdvertencia.Direta,
  data: { toDate: () => new Date('2026-04-01') } as unknown as import('firebase/firestore').Timestamp,
}

const RESULTADO_PADRAO = { aluno: ALUNO_FIXTURE, advertencias: [ADV_FIXTURE] }

beforeEach(() => {
  jest.clearAllMocks()
  mockBuscarDetalheAluno.mockResolvedValue(RESULTADO_PADRAO)
  mockSuspenderAluno.mockResolvedValue(undefined)
  mockExcluirAluno.mockResolvedValue(undefined)
  mockReativarAluno.mockResolvedValue(undefined)
  mockAplicarAdvertencia.mockResolvedValue(undefined)
})

// ── Estado inicial ─────────────────────────────────────────────────────────────

describe('useAdminDetalheAluno — estado inicial', () => {
  it('começa com carregando=true', () => {
    mockBuscarDetalheAluno.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useAdminDetalheAluno('a1'))
    expect(result.current.carregando).toBe(true)
  })

  it('começa com aluno=null', () => {
    mockBuscarDetalheAluno.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useAdminDetalheAluno('a1'))
    expect(result.current.aluno).toBeNull()
  })

  it('começa com advertencias=[]', () => {
    mockBuscarDetalheAluno.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useAdminDetalheAluno('a1'))
    expect(result.current.advertencias).toHaveLength(0)
  })

  it('chama buscarDetalheAluno com o alunoId correto', async () => {
    const { result } = renderHook(() => useAdminDetalheAluno('a1'))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(mockBuscarDetalheAluno).toHaveBeenCalledWith('a1')
  })

  it('popula aluno e advertencias após carregamento', async () => {
    const { result } = renderHook(() => useAdminDetalheAluno('a1'))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.aluno).toMatchObject({ id: 'a1' })
    expect(result.current.advertencias).toHaveLength(1)
  })
})

// ── Erro ──────────────────────────────────────────────────────────────────────

describe('useAdminDetalheAluno — erro', () => {
  it('seta erro quando buscarDetalheAluno rejeita', async () => {
    mockBuscarDetalheAluno.mockRejectedValue(new Error('Aluno não encontrado.'))
    const { result } = renderHook(() => useAdminDetalheAluno('a1'))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.erro).toBe('Aluno não encontrado.')
  })

  it('usa mensagem genérica para erros desconhecidos', async () => {
    mockBuscarDetalheAluno.mockRejectedValue('erro-inesperado')
    const { result } = renderHook(() => useAdminDetalheAluno('a1'))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.erro).toBe('Erro ao carregar aluno.')
  })
})

// ── aplicarAdvertencia ────────────────────────────────────────────────────────

describe('useAdminDetalheAluno — aplicarAdvertencia', () => {
  it('chama advertenciaService com alunoId, motivo e adminId', async () => {
    const { result } = renderHook(() => useAdminDetalheAluno('a1'))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.aplicarAdvertencia('Conduta inadequada')
    })

    expect(mockAplicarAdvertencia).toHaveBeenCalledWith('a1', 'Conduta inadequada', 'admin-uid')
  })

  it('recarrega os dados após aplicar advertência', async () => {
    const { result } = renderHook(() => useAdminDetalheAluno('a1'))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.aplicarAdvertencia('Conduta inadequada')
    })

    expect(mockBuscarDetalheAluno).toHaveBeenCalledTimes(2)
  })
})

// ── suspenderAluno ────────────────────────────────────────────────────────────

describe('useAdminDetalheAluno — suspenderAluno', () => {
  it('chama adminService.suspenderAluno com o alunoId correto', async () => {
    const { result } = renderHook(() => useAdminDetalheAluno('a1'))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.suspenderAluno()
    })

    expect(mockSuspenderAluno).toHaveBeenCalledWith('a1', expect.any(Date))
  })

  it('recarrega os dados após suspender', async () => {
    const { result } = renderHook(() => useAdminDetalheAluno('a1'))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.suspenderAluno()
    })

    expect(mockBuscarDetalheAluno).toHaveBeenCalledTimes(2)
  })
})

// ── reativarAluno ─────────────────────────────────────────────────────────────

describe('useAdminDetalheAluno — reativarAluno', () => {
  it('chama alunoService.reativarAluno com o alunoId correto', async () => {
    const { result } = renderHook(() => useAdminDetalheAluno('a1'))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.reativarAluno()
    })

    expect(mockReativarAluno).toHaveBeenCalledWith('a1')
  })

  it('recarrega os dados após reativar', async () => {
    const { result } = renderHook(() => useAdminDetalheAluno('a1'))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.reativarAluno()
    })

    expect(mockBuscarDetalheAluno).toHaveBeenCalledTimes(2)
  })
})

// ── excluirAluno ──────────────────────────────────────────────────────────────

describe('useAdminDetalheAluno — excluirAluno', () => {
  it('chama adminService.excluirAluno com o alunoId correto', async () => {
    const { result } = renderHook(() => useAdminDetalheAluno('a1'))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.excluirAluno()
    })

    expect(mockExcluirAluno).toHaveBeenCalledWith('a1')
  })
})
