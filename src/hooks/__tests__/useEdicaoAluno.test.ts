import { renderHook, act, waitFor } from '@testing-library/react'
import { useEdicaoAluno } from '@/hooks/useEdicaoAluno'
import { StatusAluno, ModalidadeAluno } from '@/types/aluno'
import type { Aluno } from '@/types/aluno'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockBuscarDetalheAluno = jest.fn()
const mockEditarAluno = jest.fn()

jest.mock('@/services/adminService', () => ({
  adminService: {
    buscarReservasDia:   jest.fn(),
    buscarDetalheAluno:  (...args: unknown[]) => mockBuscarDetalheAluno(...args),
    suspenderAluno:      jest.fn(),
    excluirAluno:        jest.fn(),
    editarAluno:         (...args: unknown[]) => mockEditarAluno(...args),
  },
}))

jest.mock('@/lib/firebase', () => ({ auth: {} }))

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

beforeEach(() => {
  jest.clearAllMocks()
  mockBuscarDetalheAluno.mockResolvedValue({ aluno: ALUNO_FIXTURE, advertencias: [] })
  mockEditarAluno.mockResolvedValue(undefined)
})

// ── Estado inicial ────────────────────────────────────────────────────────────

describe('useEdicaoAluno — estado inicial', () => {
  it('começa com carregando=true', () => {
    mockBuscarDetalheAluno.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useEdicaoAluno('a1'))
    expect(result.current.carregando).toBe(true)
  })

  it('começa com aluno=null', () => {
    mockBuscarDetalheAluno.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useEdicaoAluno('a1'))
    expect(result.current.aluno).toBeNull()
  })

  it('começa com salvando=false', () => {
    mockBuscarDetalheAluno.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useEdicaoAluno('a1'))
    expect(result.current.salvando).toBe(false)
  })

  it('chama buscarDetalheAluno com o alunoId correto', async () => {
    const { result } = renderHook(() => useEdicaoAluno('a1'))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(mockBuscarDetalheAluno).toHaveBeenCalledWith('a1')
  })

  it('popula aluno após carregamento', async () => {
    const { result } = renderHook(() => useEdicaoAluno('a1'))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.aluno).toMatchObject({ id: 'a1', nome: 'Alice Santos' })
  })
})

// ── Erro de carregamento ──────────────────────────────────────────────────────

describe('useEdicaoAluno — erro de carregamento', () => {
  it('seta erro quando buscarDetalheAluno rejeita', async () => {
    mockBuscarDetalheAluno.mockRejectedValue(new Error('Aluno não encontrado.'))
    const { result } = renderHook(() => useEdicaoAluno('a1'))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.erro).toBe('Aluno não encontrado.')
  })

  it('usa mensagem genérica para erros desconhecidos', async () => {
    mockBuscarDetalheAluno.mockRejectedValue('erro-inesperado')
    const { result } = renderHook(() => useEdicaoAluno('a1'))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.erro).toBe('Erro ao carregar aluno.')
  })
})

// ── salvar ────────────────────────────────────────────────────────────────────

describe('useEdicaoAluno — salvar', () => {
  it('chama adminService.editarAluno com alunoId e dados', async () => {
    const { result } = renderHook(() => useEdicaoAluno('a1'))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.salvar({ nome: 'Novo Nome' })
    })

    expect(mockEditarAluno).toHaveBeenCalledWith('a1', { nome: 'Novo Nome' })
  })

  it('salvando fica true durante salvar', async () => {
    let resolver!: () => void
    mockEditarAluno.mockReturnValue(new Promise<void>(r => { resolver = r }))

    const { result } = renderHook(() => useEdicaoAluno('a1'))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    act(() => { void result.current.salvar({ nome: 'X' }) })

    expect(result.current.salvando).toBe(true)
    resolver()
  })

  it('salvando volta a false após salvar com sucesso', async () => {
    const { result } = renderHook(() => useEdicaoAluno('a1'))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.salvar({ nome: 'X' })
    })

    expect(result.current.salvando).toBe(false)
  })

  it('salvando volta a false após erro', async () => {
    mockEditarAluno.mockRejectedValue(new Error('Erro'))

    const { result } = renderHook(() => useEdicaoAluno('a1'))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await act(async () => {
      await result.current.salvar({ nome: 'X' }).catch(() => {})
    })

    expect(result.current.salvando).toBe(false)
  })

  it('propaga erro quando editarAluno falha', async () => {
    mockEditarAluno.mockRejectedValue(new Error('Sem permissão'))

    const { result } = renderHook(() => useEdicaoAluno('a1'))
    await waitFor(() => expect(result.current.carregando).toBe(false))

    await expect(
      act(async () => { await result.current.salvar({ nome: 'X' }) })
    ).rejects.toThrow('Sem permissão')
  })
})
