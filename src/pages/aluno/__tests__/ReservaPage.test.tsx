import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReservaPage } from '@/pages/aluno/ReservaPage'
import { StatusAluno, ModalidadeAluno } from '@/types/aluno'
import type { Aluno } from '@/types/aluno'
import type { Ponto } from '@/types/ponto'
import type { Reserva } from '@/types/reserva'

// ── Mock do hook useReserva ────────────────────────────────────────────────────

const mockConfirmarReserva = jest.fn()
const mockCancelarReserva = jest.fn()
const mockSelecionarPonto = jest.fn()

const mockUseReserva = jest.fn()

jest.mock('@/hooks/useReserva', () => ({
  useReserva: (...args: unknown[]) => mockUseReserva(...args),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockAluno: Aluno = {
  id: 'aluno-1',
  nome: 'Luana Beatriz',
  cpf: '12345678901',
  telefone: '82999999999',
  endereco: 'Rua das Flores, 123',
  foto: null,
  faculdade: 'Uninassau',
  curso: 'Direito',
  modalidade: ModalidadeAluno.Presencial,
  semestre: 3,
  anoConclusao: 2026,
  pontoEmbarquePadrao: 'Praça Central',
  status: StatusAluno.Ativo,
  dataSuspensao: null,
  dataReativacao: null,
  primeiroAcesso: false,
}

const mockAlunaSuspenso: Aluno = {
  ...mockAluno,
  status: StatusAluno.Suspenso,
}

const mockPontos: Ponto[] = [
  { id: 'p-1', nome: 'Praça Central', ativo: true },
  { id: 'p-2', nome: 'Terminal Norte', ativo: true },
]

const mockReserva: Reserva = {
  id: 'r-1',
  alunoId: 'aluno-1',
  data: '2024-01-16',
  pontoEscolhido: 'Praça Central',
  criadaEm: {} as never,
}

function defaultState(overrides = {}) {
  return {
    aluno: mockAluno,
    pontos: mockPontos,
    reservaAtiva: null,
    pontoSelecionado: 'Praça Central',
    carregando: false,
    enviando: false,
    erro: null,
    dataDaViagem: '2024-01-16',
    janelaEstaAberta: true,
    cancelamentoEstaPermitido: false,
    confirmarReserva: mockConfirmarReserva,
    cancelarReserva: mockCancelarReserva,
    selecionarPonto: mockSelecionarPonto,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseReserva.mockReturnValue(defaultState())
})

// ── Carregamento ──────────────────────────────────────────────────────────────

describe('ReservaPage — estado de carregamento', () => {
  it('exibe spinner enquanto carregando=true', () => {
    mockUseReserva.mockReturnValue(defaultState({ carregando: true, aluno: null }))
    render(<ReservaPage />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('não exibe spinner quando carregando=false', () => {
    render(<ReservaPage />)
    expect(screen.queryByTestId('spinner')).not.toBeInTheDocument()
  })
})

// ── Indicador de janela ───────────────────────────────────────────────────────

describe('ReservaPage — indicador de janela', () => {
  it('exibe texto "Inscrições abertas" quando janelaEstaAberta=true', () => {
    render(<ReservaPage />)
    expect(screen.getByText('Inscrições abertas')).toBeInTheDocument()
  })

  it('exibe texto "Inscrições encerradas" quando janelaEstaAberta=false', () => {
    mockUseReserva.mockReturnValue(defaultState({ janelaEstaAberta: false }))
    render(<ReservaPage />)
    expect(screen.getByText('Inscrições encerradas')).toBeInTheDocument()
  })

  it('indicador de janela aberta tem classe de cor verde', () => {
    render(<ReservaPage />)
    const indicador = screen.getByTestId('indicador-janela')
    expect(indicador.className).toMatch(/success/)
  })

  it('indicador de janela fechada tem classe de cor vermelha', () => {
    mockUseReserva.mockReturnValue(defaultState({ janelaEstaAberta: false }))
    render(<ReservaPage />)
    const indicador = screen.getByTestId('indicador-janela')
    expect(indicador.className).toMatch(/danger/)
  })
})

// ── Dados do aluno ────────────────────────────────────────────────────────────

describe('ReservaPage — dados do aluno', () => {
  it('exibe a faculdade do aluno', () => {
    render(<ReservaPage />)
    expect(screen.getByText(/Uninassau/)).toBeInTheDocument()
  })

  it('exibe o curso do aluno', () => {
    render(<ReservaPage />)
    expect(screen.getByText(/Direito/)).toBeInTheDocument()
  })

  it('exibe o semestre do aluno', () => {
    render(<ReservaPage />)
    expect(screen.getByText(/3/)).toBeInTheDocument()
  })
})

// ── Seletor de pontos ─────────────────────────────────────────────────────────

describe('ReservaPage — seletor de pontos', () => {
  it('renderiza todos os pontos disponíveis', () => {
    render(<ReservaPage />)
    expect(screen.getByText('Praça Central')).toBeInTheDocument()
    expect(screen.getByText('Terminal Norte')).toBeInTheDocument()
  })

  it('chama selecionarPonto ao clicar em um ponto', () => {
    render(<ReservaPage />)
    fireEvent.click(screen.getByText('Terminal Norte'))
    expect(mockSelecionarPonto).toHaveBeenCalledWith('Terminal Norte')
  })

  it('ponto selecionado tem aria-pressed=true', () => {
    render(<ReservaPage />)
    const botaoPracaCentral = screen.getByRole('button', { name: /Praça Central/ })
    expect(botaoPracaCentral).toHaveAttribute('aria-pressed', 'true')
  })

  it('ponto não selecionado tem aria-pressed=false', () => {
    render(<ReservaPage />)
    const botaoTerminal = screen.getByRole('button', { name: /Terminal Norte/ })
    expect(botaoTerminal).toHaveAttribute('aria-pressed', 'false')
  })
})

// ── Botão confirmar ───────────────────────────────────────────────────────────

describe('ReservaPage — botão confirmar', () => {
  it('exibe botão de confirmar quando janela está aberta e sem reserva ativa', () => {
    render(<ReservaPage />)
    expect(screen.getByRole('button', { name: /confirmar reserva/i })).toBeInTheDocument()
  })

  it('chama confirmarReserva ao clicar no botão', async () => {
    mockConfirmarReserva.mockResolvedValue(undefined)
    render(<ReservaPage />)
    fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }))
    await waitFor(() => expect(mockConfirmarReserva).toHaveBeenCalledTimes(1))
  })

  it('desabilita botão quando enviando=true', () => {
    mockUseReserva.mockReturnValue(defaultState({ enviando: true }))
    render(<ReservaPage />)
    expect(screen.getByRole('button', { name: /confirmar reserva/i })).toBeDisabled()
  })

  it('desabilita botão quando janela está fechada', () => {
    mockUseReserva.mockReturnValue(defaultState({ janelaEstaAberta: false }))
    render(<ReservaPage />)
    expect(screen.getByRole('button', { name: /confirmar reserva/i })).toBeDisabled()
  })

  it('oculta botão confirmar quando já há reserva ativa', () => {
    mockUseReserva.mockReturnValue(defaultState({ reservaAtiva: mockReserva }))
    render(<ReservaPage />)
    expect(screen.queryByRole('button', { name: /confirmar reserva/i })).not.toBeInTheDocument()
  })
})

// ── Botão cancelar ────────────────────────────────────────────────────────────

describe('ReservaPage — botão cancelar', () => {
  it('oculta botão cancelar quando não há reserva ativa', () => {
    render(<ReservaPage />)
    expect(screen.queryByRole('button', { name: /cancelar reserva/i })).not.toBeInTheDocument()
  })

  it('exibe botão cancelar quando há reserva e cancelamento está permitido', () => {
    mockUseReserva.mockReturnValue(defaultState({
      reservaAtiva: mockReserva,
      cancelamentoEstaPermitido: true,
    }))
    render(<ReservaPage />)
    expect(screen.getByRole('button', { name: /cancelar reserva/i })).toBeInTheDocument()
  })

  it('oculta botão cancelar quando reserva existe mas prazo expirou', () => {
    mockUseReserva.mockReturnValue(defaultState({
      reservaAtiva: mockReserva,
      cancelamentoEstaPermitido: false,
    }))
    render(<ReservaPage />)
    expect(screen.queryByRole('button', { name: /cancelar reserva/i })).not.toBeInTheDocument()
  })

  it('chama cancelarReserva ao clicar no botão', async () => {
    mockCancelarReserva.mockResolvedValue(undefined)
    mockUseReserva.mockReturnValue(defaultState({
      reservaAtiva: mockReserva,
      cancelamentoEstaPermitido: true,
    }))
    render(<ReservaPage />)
    fireEvent.click(screen.getByRole('button', { name: /cancelar reserva/i }))
    await waitFor(() => expect(mockCancelarReserva).toHaveBeenCalledTimes(1))
  })
})

// ── Estado de suspensão ───────────────────────────────────────────────────────

describe('ReservaPage — estado de suspensão', () => {
  it('exibe mensagem de suspensão quando aluno está suspenso', () => {
    mockUseReserva.mockReturnValue(defaultState({ aluno: mockAlunaSuspenso }))
    render(<ReservaPage />)
    expect(screen.getByText(/suspenso/i)).toBeInTheDocument()
  })

  it('desabilita botão confirmar quando aluno está suspenso', () => {
    mockUseReserva.mockReturnValue(defaultState({ aluno: mockAlunaSuspenso }))
    render(<ReservaPage />)
    expect(screen.getByRole('button', { name: /confirmar reserva/i })).toBeDisabled()
  })
})

// ── Mensagem de erro ──────────────────────────────────────────────────────────

describe('ReservaPage — mensagem de erro', () => {
  it('exibe mensagem de erro quando erro não é null', () => {
    mockUseReserva.mockReturnValue(defaultState({ erro: 'A janela de reservas está fechada.' }))
    render(<ReservaPage />)
    expect(screen.getByText('A janela de reservas está fechada.')).toBeInTheDocument()
  })

  it('não exibe mensagem de erro quando erro é null', () => {
    render(<ReservaPage />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
