import { render, screen, fireEvent } from '@testing-library/react'
import { ReservasPage } from '@/pages/admin/ReservasPage'
import { StatusAluno, ModalidadeAluno } from '@/types/aluno'
import type { ReservaAdmin } from '@/services/adminService'
import type { UseAdminReservasReturn } from '@/hooks/useAdminReservas'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSelecionarAba = jest.fn()
const mockUseAdminReservas = jest.fn()

jest.mock('@/hooks/useAdminReservas', () => ({
  useAdminReservas: (...args: unknown[]) => mockUseAdminReservas(...args),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeReserva(id: string, faculdade: string): ReservaAdmin {
  return {
    reservaId: id,
    aluno: {
      id: `aluno-${id}`,
      nome: `Aluno ${id}`,
      cpf: '00000000000',
      telefone: '(82) 99999-0000',
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

const RESERVA_UFAL = makeReserva('r1', 'UFAL')
const RESERVA_UNIT = makeReserva('r2', 'UNIT')

function defaultState(overrides: Partial<UseAdminReservasReturn> = {}): UseAdminReservasReturn {
  return {
    aba: 'hoje',
    reservasAgrupadas: { UFAL: [RESERVA_UFAL], UNIT: [RESERVA_UNIT] },
    metricas: { hoje: 2, amanha: 1, total: 3 },
    abaAmanhaDisponivel: true,
    carregando: false,
    erro: null,
    selecionarAba: mockSelecionarAba,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseAdminReservas.mockReturnValue(defaultState())
})

// ── Spinner ───────────────────────────────────────────────────────────────────

describe('ReservasPage — carregando', () => {
  it('exibe spinner quando carregando=true', () => {
    mockUseAdminReservas.mockReturnValue(
      defaultState({ carregando: true, reservasAgrupadas: {} })
    )
    render(<ReservasPage />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('oculta spinner quando carregando=false', () => {
    render(<ReservasPage />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

// ── Cards de métricas ─────────────────────────────────────────────────────────

describe('ReservasPage — cards de métricas', () => {
  it('exibe card de Hoje', () => {
    render(<ReservasPage />)
    expect(screen.getByTestId('metric-hoje')).toBeInTheDocument()
  })

  it('exibe card de Amanhã', () => {
    render(<ReservasPage />)
    expect(screen.getByTestId('metric-amanha')).toBeInTheDocument()
  })

  it('exibe card de Total', () => {
    render(<ReservasPage />)
    expect(screen.getByTestId('metric-total')).toBeInTheDocument()
  })

  it('card Hoje exibe valor correto', () => {
    render(<ReservasPage />)
    const hoje = screen.getByTestId('metric-hoje')
    expect(hoje).toHaveTextContent('2')
  })

  it('card Amanhã exibe valor correto', () => {
    render(<ReservasPage />)
    const amanha = screen.getByTestId('metric-amanha')
    expect(amanha).toHaveTextContent('1')
  })

  it('card Total exibe valor correto', () => {
    render(<ReservasPage />)
    const total = screen.getByTestId('metric-total')
    expect(total).toHaveTextContent('3')
  })
})

// ── Tabs ──────────────────────────────────────────────────────────────────────

describe('ReservasPage — tabs', () => {
  it('tab Hoje está sempre visível', () => {
    render(<ReservasPage />)
    expect(screen.getByRole('button', { name: /hoje/i })).toBeInTheDocument()
  })

  it('tab Amanhã visível quando abaAmanhaDisponivel=true', () => {
    render(<ReservasPage />)
    expect(screen.getByRole('button', { name: /amanhã/i })).toBeInTheDocument()
  })

  it('tab Amanhã não visível quando abaAmanhaDisponivel=false', () => {
    mockUseAdminReservas.mockReturnValue(
      defaultState({ abaAmanhaDisponivel: false })
    )
    render(<ReservasPage />)
    expect(screen.queryByRole('button', { name: /amanhã/i })).not.toBeInTheDocument()
  })

  it('clicar na tab Amanhã chama selecionarAba("amanha")', () => {
    render(<ReservasPage />)
    fireEvent.click(screen.getByRole('button', { name: /amanhã/i }))
    expect(mockSelecionarAba).toHaveBeenCalledWith('amanha')
  })

  it('clicar na tab Hoje chama selecionarAba("hoje")', () => {
    mockUseAdminReservas.mockReturnValue(defaultState({ aba: 'amanha' }))
    render(<ReservasPage />)
    fireEvent.click(screen.getByRole('button', { name: /hoje/i }))
    expect(mockSelecionarAba).toHaveBeenCalledWith('hoje')
  })
})

// ── Lista por faculdade ────────────────────────────────────────────────────────

describe('ReservasPage — lista por faculdade', () => {
  it('exibe heading de cada faculdade', () => {
    render(<ReservasPage />)
    expect(screen.getByRole('heading', { name: /ufal/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /unit/i })).toBeInTheDocument()
  })

  it('exibe a quantidade de reservas por faculdade', () => {
    render(<ReservasPage />)
    expect(screen.getByTestId('count-UFAL')).toHaveTextContent('1')
    expect(screen.getByTestId('count-UNIT')).toHaveTextContent('1')
  })

  it('exibe o nome do aluno em cada card', () => {
    render(<ReservasPage />)
    expect(screen.getByText('Aluno r1')).toBeInTheDocument()
    expect(screen.getByText('Aluno r2')).toBeInTheDocument()
  })

  it('exibe o ponto de embarque no card do aluno', () => {
    render(<ReservasPage />)
    const cards = screen.getAllByText('Ponto A')
    expect(cards.length).toBeGreaterThanOrEqual(1)
  })
})

// ── Empty state ───────────────────────────────────────────────────────────────

describe('ReservasPage — empty state', () => {
  it('exibe empty state quando não há reservas', () => {
    mockUseAdminReservas.mockReturnValue(defaultState({ reservasAgrupadas: {} }))
    render(<ReservasPage />)
    expect(screen.getByText(/nenhuma reserva/i)).toBeInTheDocument()
  })

  it('não exibe empty state quando há reservas', () => {
    render(<ReservasPage />)
    expect(screen.queryByText(/nenhuma reserva/i)).not.toBeInTheDocument()
  })
})

// ── Erro ──────────────────────────────────────────────────────────────────────

describe('ReservasPage — erro', () => {
  it('exibe mensagem de erro', () => {
    mockUseAdminReservas.mockReturnValue(
      defaultState({ erro: 'Falha na rede', reservasAgrupadas: {} })
    )
    render(<ReservasPage />)
    expect(screen.getByText('Falha na rede')).toBeInTheDocument()
  })
})
