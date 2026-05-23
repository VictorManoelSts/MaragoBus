import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { AlunosPage } from '@/pages/admin/AlunosPage'
import { StatusAluno, ModalidadeAluno } from '@/types/aluno'
import type { Aluno } from '@/types/aluno'
import type { UseAlunosReturn } from '@/hooks/useAlunos'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSetBusca = jest.fn()
const mockSetFiltroStatus = jest.fn()
const mockReativarAluno = jest.fn()
const mockUseAlunos = jest.fn()

jest.mock('@/hooks/useAlunos', () => ({
  useAlunos: (...args: unknown[]) => mockUseAlunos(...args),
}))

const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
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

const ALUNO_ATIVO = makeAluno({
  id: 'a1',
  nome: 'Alice Santos',
  status: StatusAluno.Ativo,
  anoConclusao: 2027,
})

const ALUNO_SUSPENSO = makeAluno({
  id: 'a2',
  nome: 'Bruno Lima',
  status: StatusAluno.Suspenso,
  anoConclusao: 2025,
})

const ALUNO_CONCLUINDO = makeAluno({
  id: 'a3',
  nome: 'Carla Melo',
  status: StatusAluno.Ativo,
  anoConclusao: ANO_ATUAL,
})

function defaultState(overrides: Partial<UseAlunosReturn> = {}): UseAlunosReturn {
  return {
    busca: '',
    filtroStatus: 'todos',
    alunosFiltrados: [ALUNO_ATIVO, ALUNO_SUSPENSO, ALUNO_CONCLUINDO],
    carregando: false,
    erro: null,
    total: 3,
    setBusca: mockSetBusca,
    setFiltroStatus: mockSetFiltroStatus,
    reativarAluno: mockReativarAluno,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseAlunos.mockReturnValue(defaultState())
  mockReativarAluno.mockResolvedValue(undefined)
})

// ── Spinner ───────────────────────────────────────────────────────────────────

describe('AlunosPage — carregando', () => {
  it('exibe spinner quando carregando=true', () => {
    mockUseAlunos.mockReturnValue(defaultState({ carregando: true, alunosFiltrados: [] }))
    render(<AlunosPage />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('não exibe lista quando carregando=true', () => {
    mockUseAlunos.mockReturnValue(defaultState({ carregando: true, alunosFiltrados: [] }))
    render(<AlunosPage />)
    expect(screen.queryByText('Alice Santos')).not.toBeInTheDocument()
  })
})

// ── Barra de busca ────────────────────────────────────────────────────────────

describe('AlunosPage — barra de busca', () => {
  it('exibe input de busca', () => {
    render(<AlunosPage />)
    expect(screen.getByPlaceholderText(/nome ou cpf/i)).toBeInTheDocument()
  })

  it('chama setBusca ao digitar no input', () => {
    render(<AlunosPage />)
    fireEvent.change(screen.getByPlaceholderText(/nome ou cpf/i), {
      target: { value: 'Alice' },
    })
    expect(mockSetBusca).toHaveBeenCalledWith('Alice')
  })

  it('exibe o valor atual da busca no input', () => {
    mockUseAlunos.mockReturnValue(defaultState({ busca: 'Bruno' }))
    render(<AlunosPage />)
    expect(screen.getByPlaceholderText(/nome ou cpf/i)).toHaveValue('Bruno')
  })
})

// ── Filtros de status ─────────────────────────────────────────────────────────

describe('AlunosPage — filtros de status', () => {
  it('exibe botão Todos', () => {
    render(<AlunosPage />)
    expect(screen.getByRole('button', { name: /todos/i })).toBeInTheDocument()
  })

  it('exibe botão Suspensos', () => {
    render(<AlunosPage />)
    expect(screen.getByRole('button', { name: /suspensos/i })).toBeInTheDocument()
  })

  it('exibe botão Concluindo', () => {
    render(<AlunosPage />)
    expect(screen.getByRole('button', { name: /concluindo/i })).toBeInTheDocument()
  })

  it('clicar em Suspensos chama setFiltroStatus("suspensos")', () => {
    render(<AlunosPage />)
    fireEvent.click(screen.getByRole('button', { name: /suspensos/i }))
    expect(mockSetFiltroStatus).toHaveBeenCalledWith('suspensos')
  })

  it('clicar em Concluindo chama setFiltroStatus("concluindo")', () => {
    render(<AlunosPage />)
    fireEvent.click(screen.getByRole('button', { name: /concluindo/i }))
    expect(mockSetFiltroStatus).toHaveBeenCalledWith('concluindo')
  })

  it('clicar em Todos chama setFiltroStatus("todos")', () => {
    mockUseAlunos.mockReturnValue(defaultState({ filtroStatus: 'suspensos' }))
    render(<AlunosPage />)
    fireEvent.click(screen.getByRole('button', { name: /todos/i }))
    expect(mockSetFiltroStatus).toHaveBeenCalledWith('todos')
  })

  it('botão Todos tem estilo ativo quando filtroStatus="todos"', () => {
    render(<AlunosPage />)
    const btn = screen.getByRole('button', { name: /todos/i })
    expect(btn.className).toMatch(/bg-primary/)
  })

  it('botão Suspensos tem estilo ativo quando filtroStatus="suspensos"', () => {
    mockUseAlunos.mockReturnValue(defaultState({ filtroStatus: 'suspensos' }))
    render(<AlunosPage />)
    const btn = screen.getByRole('button', { name: /suspensos/i })
    expect(btn.className).toMatch(/bg-primary/)
  })
})

// ── Cards de aluno ────────────────────────────────────────────────────────────

describe('AlunosPage — cards de aluno', () => {
  it('exibe o nome de cada aluno', () => {
    render(<AlunosPage />)
    expect(screen.getByText('Alice Santos')).toBeInTheDocument()
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument()
    expect(screen.getByText('Carla Melo')).toBeInTheDocument()
  })

  it('exibe faculdade, curso e semestre no card', () => {
    render(<AlunosPage />)
    const card = screen.getByTestId('aluno-card-a1')
    expect(within(card).getByText(/ufal/i)).toBeInTheDocument()
    expect(within(card).getByText(/direito/i)).toBeInTheDocument()
    expect(within(card).getByText(/sem/i)).toBeInTheDocument()
  })

  it('exibe avatar com iniciais do aluno', () => {
    render(<AlunosPage />)
    const card = screen.getByTestId('aluno-card-a1')
    expect(within(card).getByText('AS')).toBeInTheDocument()
  })

  it('navega para detalhe ao clicar no card (área clicável, não no badge)', () => {
    render(<AlunosPage />)
    const card = screen.getByTestId('aluno-card-a1')
    fireEvent.click(card)
    expect(mockNavigate).toHaveBeenCalledWith('/admin/alunos/a1')
  })
})

// ── Badges de status ──────────────────────────────────────────────────────────

describe('AlunosPage — badges de status', () => {
  it('exibe badge "Ativo" em verde para aluno ativo fora do ano de conclusão', () => {
    render(<AlunosPage />)
    const card = screen.getByTestId('aluno-card-a1')
    const badge = within(card).getByTestId('badge-status')
    expect(badge).toHaveTextContent('Ativo')
    expect(badge.className).toMatch(/success/)
  })

  it('exibe badge "Suspenso" em vermelho para aluno suspenso', () => {
    render(<AlunosPage />)
    const card = screen.getByTestId('aluno-card-a2')
    const badge = within(card).getByTestId('badge-status')
    expect(badge).toHaveTextContent('Suspenso')
    expect(badge.className).toMatch(/danger/)
  })

  it('exibe badge "Concluindo" em âmbar para aluno no ano de conclusão', () => {
    render(<AlunosPage />)
    const card = screen.getByTestId('aluno-card-a3')
    const badge = within(card).getByTestId('badge-status')
    expect(badge).toHaveTextContent('Concluindo')
    expect(badge.className).toMatch(/warning/)
  })
})

// ── Reativação rápida ─────────────────────────────────────────────────────────

describe('AlunosPage — reativação rápida pelo badge Suspenso', () => {
  it('badge Suspenso é clicável (tem role button)', () => {
    render(<AlunosPage />)
    const card = screen.getByTestId('aluno-card-a2')
    const badge = within(card).getByRole('button', { name: /suspenso/i })
    expect(badge).toBeInTheDocument()
  })

  it('clicar no badge Suspenso abre modal de confirmação', () => {
    render(<AlunosPage />)
    const card = screen.getByTestId('aluno-card-a2')
    fireEvent.click(within(card).getByRole('button', { name: /suspenso/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('modal exibe texto de confirmação de reativação', () => {
    render(<AlunosPage />)
    const card = screen.getByTestId('aluno-card-a2')
    fireEvent.click(within(card).getByRole('button', { name: /suspenso/i }))
    expect(screen.getByText(/reativar/i)).toBeInTheDocument()
    expect(screen.getByText(/acesso às reservas imediatamente/i)).toBeInTheDocument()
  })

  it('confirmar reativação chama reativarAluno com o id correto', async () => {
    render(<AlunosPage />)
    const card = screen.getByTestId('aluno-card-a2')
    fireEvent.click(within(card).getByRole('button', { name: /suspenso/i }))

    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() =>
      expect(mockReativarAluno).toHaveBeenCalledWith('a2')
    )
  })

  it('cancelar fecha o modal sem chamar reativarAluno', () => {
    render(<AlunosPage />)
    const card = screen.getByTestId('aluno-card-a2')
    fireEvent.click(within(card).getByRole('button', { name: /suspenso/i }))

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mockReativarAluno).not.toHaveBeenCalled()
  })

  it('fechar modal sem confirmar não chama reativarAluno', () => {
    render(<AlunosPage />)
    const card = screen.getByTestId('aluno-card-a2')
    fireEvent.click(within(card).getByRole('button', { name: /suspenso/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))

    expect(mockReativarAluno).not.toHaveBeenCalled()
  })

  it('badge Ativo não é clicável para reativação', () => {
    render(<AlunosPage />)
    const card = screen.getByTestId('aluno-card-a1')
    const badge = within(card).getByTestId('badge-status')
    // badge ativo não deve ser um button
    expect(badge.tagName).not.toBe('BUTTON')
  })
})

// ── Empty state ───────────────────────────────────────────────────────────────

describe('AlunosPage — empty state', () => {
  it('exibe empty state quando lista está vazia e não está carregando', () => {
    mockUseAlunos.mockReturnValue(defaultState({ alunosFiltrados: [], total: 0 }))
    render(<AlunosPage />)
    expect(screen.getByText(/nenhum aluno/i)).toBeInTheDocument()
  })

  it('não exibe empty state quando há alunos', () => {
    render(<AlunosPage />)
    expect(screen.queryByText(/nenhum aluno/i)).not.toBeInTheDocument()
  })
})

// ── Erro ──────────────────────────────────────────────────────────────────────

describe('AlunosPage — erro', () => {
  it('exibe mensagem de erro quando erro está definido', () => {
    mockUseAlunos.mockReturnValue(defaultState({ erro: 'Falha de rede', alunosFiltrados: [] }))
    render(<AlunosPage />)
    expect(screen.getByText('Falha de rede')).toBeInTheDocument()
  })
})

// ── Total ─────────────────────────────────────────────────────────────────────

describe('AlunosPage — total', () => {
  it('exibe o total de alunos encontrados', () => {
    render(<AlunosPage />)
    expect(screen.getByTestId('total-alunos')).toHaveTextContent('3')
  })
})
