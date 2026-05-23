import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { ListaAlunosPage } from '@/pages/motorista/ListaAlunosPage'
import { StatusAluno, ModalidadeAluno } from '@/types/aluno'
import type { AlunoComReserva } from '@/services/motoristaService'
import type { UseMotoristaReturn } from '@/hooks/useMotorista'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSelecionarAba = jest.fn()
const mockToggleFaculdade = jest.fn()
const mockTogglePonto = jest.fn()
const mockSolicitarAdvertencia = jest.fn()
const mockUseMotorista = jest.fn()

jest.mock('@/hooks/useMotorista', () => ({
  useMotorista: (...args: unknown[]) => mockUseMotorista(...args),
}))

const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeAluno(id: string, nome: string, faculdade: string, ponto: string): AlunoComReserva {
  return {
    reservaId: `r-${id}`,
    aluno: {
      id,
      nome,
      cpf: `0000000000${id}`,
      telefone: '82999999999',
      endereco: 'Rua A',
      foto: null,
      faculdade,
      curso: 'Direito',
      modalidade: ModalidadeAluno.Presencial,
      semestre: 3,
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

const ALUNO_UFAL = makeAluno('a1', 'Alice Santos', 'UFAL', 'Ponto Central')
const ALUNO_UNIT = makeAluno('a2', 'Bruno Lima', 'UNIT', 'Ponto Norte')

const AGRUPADOS_CHEIOS = {
  UFAL: [ALUNO_UFAL],
  UNIT: [ALUNO_UNIT],
}

function defaultState(overrides: Partial<UseMotoristaReturn> = {}): UseMotoristaReturn {
  return {
    aba: 'hoje',
    alunos: [ALUNO_UFAL, ALUNO_UNIT],
    alunosAgrupados: AGRUPADOS_CHEIOS,
    faculdadesDisponiveis: ['UFAL', 'UNIT'],
    pontosDisponiveis: ['Ponto Central', 'Ponto Norte'],
    filtros: {},
    carregando: false,
    erro: null,
    abaAmanhaBloqueada: false,
    total: 2,
    selecionarAba: mockSelecionarAba,
    toggleFaculdade: mockToggleFaculdade,
    togglePonto: mockTogglePonto,
    solicitarAdvertencia: mockSolicitarAdvertencia,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseMotorista.mockReturnValue(defaultState())
})

// ── Tabs ──────────────────────────────────────────────────────────────────────

describe('ListaAlunosPage — tabs', () => {
  it('exibe tab Hoje e tab Amanhã', () => {
    render(<ListaAlunosPage />)
    expect(screen.getByRole('button', { name: /hoje/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /amanhã/i })).toBeInTheDocument()
  })

  it('chama selecionarAba("amanha") ao clicar na tab Amanhã', () => {
    render(<ListaAlunosPage />)
    fireEvent.click(screen.getByRole('button', { name: /amanhã/i }))
    expect(mockSelecionarAba).toHaveBeenCalledWith('amanha')
  })

  it('chama selecionarAba("hoje") ao clicar na tab Hoje', () => {
    mockUseMotorista.mockReturnValue(defaultState({ aba: 'amanha' }))
    render(<ListaAlunosPage />)
    fireEvent.click(screen.getByRole('button', { name: /hoje/i }))
    expect(mockSelecionarAba).toHaveBeenCalledWith('hoje')
  })
})

// ── Spinner ───────────────────────────────────────────────────────────────────

describe('ListaAlunosPage — carregando', () => {
  it('exibe spinner quando carregando=true', () => {
    mockUseMotorista.mockReturnValue(defaultState({ carregando: true, alunos: [], alunosAgrupados: {} }))
    render(<ListaAlunosPage />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('não exibe lista quando carregando=true', () => {
    mockUseMotorista.mockReturnValue(defaultState({ carregando: true, alunos: [], alunosAgrupados: {} }))
    render(<ListaAlunosPage />)
    expect(screen.queryByText('Alice Santos')).not.toBeInTheDocument()
  })
})

// ── Total e filtros ───────────────────────────────────────────────────────────

describe('ListaAlunosPage — total e filtros', () => {
  it('exibe total de alunos', () => {
    render(<ListaAlunosPage />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('exibe chips de faculdade disponíveis', () => {
    render(<ListaAlunosPage />)
    expect(screen.getByRole('button', { name: 'UFAL' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'UNIT' })).toBeInTheDocument()
  })

  it('exibe chips de ponto disponíveis', () => {
    render(<ListaAlunosPage />)
    expect(screen.getByRole('button', { name: 'Ponto Central' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ponto Norte' })).toBeInTheDocument()
  })

  it('chama toggleFaculdade ao clicar no chip de faculdade', () => {
    render(<ListaAlunosPage />)
    fireEvent.click(screen.getByRole('button', { name: 'UFAL' }))
    expect(mockToggleFaculdade).toHaveBeenCalledWith('UFAL')
  })

  it('chama togglePonto ao clicar no chip de ponto', () => {
    render(<ListaAlunosPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Ponto Norte' }))
    expect(mockTogglePonto).toHaveBeenCalledWith('Ponto Norte')
  })

  it('chip de faculdade ativa tem classes de ativo', () => {
    mockUseMotorista.mockReturnValue(defaultState({ filtros: { faculdade: 'UFAL' } }))
    render(<ListaAlunosPage />)
    const chip = screen.getByRole('button', { name: 'UFAL' })
    expect(chip.className).toMatch(/bg-primary/)
  })

  it('chip de ponto ativo tem classes de ativo', () => {
    mockUseMotorista.mockReturnValue(defaultState({ filtros: { pontoEmbarque: 'Ponto Norte' } }))
    render(<ListaAlunosPage />)
    const chip = screen.getByRole('button', { name: 'Ponto Norte' })
    expect(chip.className).toMatch(/bg-primary/)
  })
})

// ── Lista agrupada ────────────────────────────────────────────────────────────

describe('ListaAlunosPage — lista agrupada por faculdade', () => {
  it('exibe o nome de cada faculdade como cabeçalho de seção', () => {
    render(<ListaAlunosPage />)
    expect(screen.getByRole('heading', { name: 'UFAL' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'UNIT' })).toBeInTheDocument()
  })

  it('exibe o nome do aluno no card', () => {
    render(<ListaAlunosPage />)
    expect(screen.getByText('Alice Santos')).toBeInTheDocument()
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument()
  })

  it('exibe o ponto de embarque do aluno no card', () => {
    render(<ListaAlunosPage />)
    const cardUfal = screen.getByTestId('aluno-card-a1')
    const cardUnit = screen.getByTestId('aluno-card-a2')
    expect(within(cardUfal).getByText('Ponto Central')).toBeInTheDocument()
    expect(within(cardUnit).getByText('Ponto Norte')).toBeInTheDocument()
  })

  it('exibe botão de advertência em cada card', () => {
    render(<ListaAlunosPage />)
    const botoes = screen.getAllByRole('button', { name: /adverti|solicit/i })
    expect(botoes.length).toBeGreaterThanOrEqual(2)
  })

  it('navega para detalhe do aluno ao clicar no card', () => {
    render(<ListaAlunosPage />)
    const card = screen.getByTestId('aluno-card-a1')
    fireEvent.click(card)
    expect(mockNavigate).toHaveBeenCalledWith('/motorista/alunos/a1')
  })
})

// ── Empty state ───────────────────────────────────────────────────────────────

describe('ListaAlunosPage — empty state', () => {
  it('exibe empty state quando não há alunos e não está carregando', () => {
    mockUseMotorista.mockReturnValue(defaultState({ alunos: [], alunosAgrupados: {}, total: 0 }))
    render(<ListaAlunosPage />)
    expect(screen.getByText(/nenhuma reserva/i)).toBeInTheDocument()
  })

  it('não exibe empty state quando há alunos', () => {
    render(<ListaAlunosPage />)
    expect(screen.queryByText(/nenhuma reserva/i)).not.toBeInTheDocument()
  })
})

// ── Aba amanhã bloqueada ──────────────────────────────────────────────────────

describe('ListaAlunosPage — aba amanhã bloqueada', () => {
  it('exibe mensagem informativa quando abaAmanhaBloqueada=true', () => {
    mockUseMotorista.mockReturnValue(
      defaultState({ aba: 'amanha', abaAmanhaBloqueada: true, alunos: [], alunosAgrupados: {}, total: 0 })
    )
    render(<ListaAlunosPage />)
    expect(screen.getByText(/5h/i)).toBeInTheDocument()
  })

  it('não exibe lista quando abaAmanhaBloqueada=true', () => {
    mockUseMotorista.mockReturnValue(
      defaultState({ aba: 'amanha', abaAmanhaBloqueada: true, alunos: [], alunosAgrupados: {}, total: 0 })
    )
    render(<ListaAlunosPage />)
    expect(screen.queryByText('Alice Santos')).not.toBeInTheDocument()
  })
})

// ── Modal de advertência ──────────────────────────────────────────────────────

describe('ListaAlunosPage — modal de advertência', () => {
  it('abre o modal ao clicar no botão de advertência', () => {
    render(<ListaAlunosPage />)
    const [botao] = screen.getAllByRole('button', { name: /adverti|solicit/i })
    fireEvent.click(botao)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('modal exibe o nome do aluno', () => {
    render(<ListaAlunosPage />)
    const [botao] = screen.getAllByRole('button', { name: /adverti|solicit/i })
    fireEvent.click(botao)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Alice Santos')).toBeInTheDocument()
  })

  it('modal tem campo de justificativa', () => {
    render(<ListaAlunosPage />)
    const [botao] = screen.getAllByRole('button', { name: /adverti|solicit/i })
    fireEvent.click(botao)
    expect(screen.getByPlaceholderText(/justificativa/i)).toBeInTheDocument()
  })

  it('botão confirmar fica desabilitado quando motivo está vazio', () => {
    render(<ListaAlunosPage />)
    const [botao] = screen.getAllByRole('button', { name: /adverti|solicit/i })
    fireEvent.click(botao)
    const confirmar = screen.getByRole('button', { name: /confirmar/i })
    expect(confirmar).toBeDisabled()
  })

  it('botão confirmar chama solicitarAdvertencia com alunoId e motivo', async () => {
    mockSolicitarAdvertencia.mockResolvedValue(undefined)
    render(<ListaAlunosPage />)
    const [botao] = screen.getAllByRole('button', { name: /adverti|solicit/i })
    fireEvent.click(botao)

    const textarea = screen.getByPlaceholderText(/justificativa/i)
    fireEvent.change(textarea, { target: { value: 'Faltou ao embarque' } })

    const confirmar = screen.getByRole('button', { name: /confirmar/i })
    fireEvent.click(confirmar)

    await waitFor(() =>
      expect(mockSolicitarAdvertencia).toHaveBeenCalledWith('a1', 'Faltou ao embarque')
    )
  })

  it('fecha o modal após confirmação bem-sucedida', async () => {
    mockSolicitarAdvertencia.mockResolvedValue(undefined)
    render(<ListaAlunosPage />)
    const [botao] = screen.getAllByRole('button', { name: /adverti|solicit/i })
    fireEvent.click(botao)

    const textarea = screen.getByPlaceholderText(/justificativa/i)
    fireEvent.change(textarea, { target: { value: 'Faltou' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('botão cancelar fecha o modal sem chamar o serviço', () => {
    render(<ListaAlunosPage />)
    const [botao] = screen.getAllByRole('button', { name: /adverti|solicit/i })
    fireEvent.click(botao)

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mockSolicitarAdvertencia).not.toHaveBeenCalled()
  })
})
