import { renderHook, act, waitFor } from '@testing-library/react'
import { useCadastroAluno } from '@/hooks/useCadastroAluno'
import { ModalidadeAluno } from '@/types/aluno'
import type { DadosCadastro } from '@/services/adminService'
import type { Ponto } from '@/types/ponto'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockBuscarPontos = jest.fn()
const mockCadastrarAluno = jest.fn()

jest.mock('@/services/adminService', () => ({
  adminService: {
    buscarReservasDia:  jest.fn(),
    buscarDetalheAluno: jest.fn(),
    suspenderAluno:     jest.fn(),
    excluirAluno:       jest.fn(),
    editarAluno:        jest.fn(),
    buscarPontos:       (...args: unknown[]) => mockBuscarPontos(...args),
    cadastrarAluno:     (...args: unknown[]) => mockCadastrarAluno(...args),
  },
}))

jest.mock('@/lib/firebase', () => ({ auth: {} }))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PONTOS: Ponto[] = [
  { id: 'p1', nome: 'Ponto Central', ativo: true },
  { id: 'p2', nome: 'Ponto Norte',   ativo: true },
]

function makeDados(overrides: Partial<DadosCadastro> = {}): DadosCadastro {
  return {
    nome: 'Alice Santos',
    cpf: '12345678901',
    senha: '789901',
    telefone: '(82) 99999-0000',
    endereco: 'Rua A, 100',
    foto: null,
    faculdade: 'UFAL',
    curso: 'Direito',
    modalidade: ModalidadeAluno.Presencial,
    semestre: 3,
    anoConclusao: 2027,
    pontoEmbarquePadrao: 'Ponto Central',
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockBuscarPontos.mockResolvedValue(PONTOS)
  mockCadastrarAluno.mockResolvedValue('uid-novo')
})

// ── Estado inicial ────────────────────────────────────────────────────────────

describe('useCadastroAluno — estado inicial', () => {
  it('começa com pontos=[]', () => {
    mockBuscarPontos.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useCadastroAluno())
    expect(result.current.pontos).toEqual([])
  })

  it('começa com carregandoPontos=true', () => {
    mockBuscarPontos.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useCadastroAluno())
    expect(result.current.carregandoPontos).toBe(true)
  })

  it('começa com salvando=false', () => {
    mockBuscarPontos.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useCadastroAluno())
    expect(result.current.salvando).toBe(false)
  })

  it('chama buscarPontos ao montar', async () => {
    const { result } = renderHook(() => useCadastroAluno())
    await waitFor(() => expect(result.current.carregandoPontos).toBe(false))
    expect(mockBuscarPontos).toHaveBeenCalledTimes(1)
  })
})

// ── Carregamento de pontos ────────────────────────────────────────────────────

describe('useCadastroAluno — carregamento de pontos', () => {
  it('popula pontos após carregar', async () => {
    const { result } = renderHook(() => useCadastroAluno())
    await waitFor(() => expect(result.current.carregandoPontos).toBe(false))
    expect(result.current.pontos).toEqual(PONTOS)
  })

  it('carregandoPontos fica false após carregar', async () => {
    const { result } = renderHook(() => useCadastroAluno())
    await waitFor(() => expect(result.current.carregandoPontos).toBe(false))
    expect(result.current.carregandoPontos).toBe(false)
  })

  it('pontos fica [] se buscarPontos falha', async () => {
    mockBuscarPontos.mockRejectedValue(new Error('Falha'))
    const { result } = renderHook(() => useCadastroAluno())
    await waitFor(() => expect(result.current.carregandoPontos).toBe(false))
    expect(result.current.pontos).toEqual([])
  })
})

// ── salvar ────────────────────────────────────────────────────────────────────

describe('useCadastroAluno — salvar', () => {
  it('chama adminService.cadastrarAluno com os dados', async () => {
    const { result } = renderHook(() => useCadastroAluno())
    await waitFor(() => expect(result.current.carregandoPontos).toBe(false))

    const dados = makeDados()
    await act(async () => { await result.current.salvar(dados) })

    expect(mockCadastrarAluno).toHaveBeenCalledWith(dados)
  })

  it('salvando fica true durante salvar', async () => {
    let resolver!: () => void
    mockCadastrarAluno.mockReturnValue(new Promise<string>(r => { resolver = r }))

    const { result } = renderHook(() => useCadastroAluno())
    await waitFor(() => expect(result.current.carregandoPontos).toBe(false))

    act(() => { void result.current.salvar(makeDados()) })

    expect(result.current.salvando).toBe(true)
    resolver()
  })

  it('salvando volta a false após sucesso', async () => {
    const { result } = renderHook(() => useCadastroAluno())
    await waitFor(() => expect(result.current.carregandoPontos).toBe(false))

    await act(async () => { await result.current.salvar(makeDados()) })

    expect(result.current.salvando).toBe(false)
  })

  it('salvando volta a false após erro', async () => {
    mockCadastrarAluno.mockRejectedValue(new Error('Erro'))
    const { result } = renderHook(() => useCadastroAluno())
    await waitFor(() => expect(result.current.carregandoPontos).toBe(false))

    await act(async () => {
      await result.current.salvar(makeDados()).catch(() => {})
    })

    expect(result.current.salvando).toBe(false)
  })

  it('propaga erro quando cadastrarAluno falha', async () => {
    mockCadastrarAluno.mockRejectedValue(new Error('CPF já cadastrado'))
    const { result } = renderHook(() => useCadastroAluno())
    await waitFor(() => expect(result.current.carregandoPontos).toBe(false))

    await expect(
      act(async () => { await result.current.salvar(makeDados()) })
    ).rejects.toThrow('CPF já cadastrado')
  })
})
