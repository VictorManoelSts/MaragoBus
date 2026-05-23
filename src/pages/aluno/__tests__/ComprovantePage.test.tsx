import { render, screen } from '@testing-library/react'
import { ComprovantePage } from '@/pages/aluno/ComprovantePage'
import { StatusAluno, ModalidadeAluno } from '@/types/aluno'
import type { Aluno } from '@/types/aluno'
import type { Reserva } from '@/types/reserva'
import type { Timestamp } from 'firebase/firestore'

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="qrcode" data-value={value} />
  ),
}))

const mockUseReserva = jest.fn()
jest.mock('@/hooks/useReserva', () => ({
  useReserva: () => mockUseReserva(),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockAluno: Aluno = {
  id: 'aluno-1',
  nome: 'Luana Beatriz',
  cpf: '12345678901',
  telefone: '(82) 99999-9999',
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

function makeTimestamp(dateStr: string): Timestamp {
  return { toDate: () => new Date(dateStr) } as unknown as Timestamp
}

const mockReserva: Reserva = {
  id: 'reserva-abc-123',
  alunoId: 'aluno-1',
  data: '2024-01-16',
  pontoEscolhido: 'Terminal Norte',
  criadaEm: makeTimestamp('2024-01-15T18:30:00'),
}

function defaultState(overrides = {}) {
  return {
    aluno: mockAluno,
    pontos: [],
    reservaAtiva: mockReserva,
    pontoSelecionado: 'Terminal Norte',
    carregando: false,
    enviando: false,
    erro: null,
    dataDaViagem: '2024-01-16',
    janelaEstaAberta: true,
    cancelamentoEstaPermitido: false,
    confirmarReserva: jest.fn(),
    cancelarReserva: jest.fn(),
    selecionarPonto: jest.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseReserva.mockReturnValue(defaultState())
})

// ── Carregamento ──────────────────────────────────────────────────────────────

describe('ComprovantePage — carregamento', () => {
  it('exibe spinner enquanto carregando=true', () => {
    mockUseReserva.mockReturnValue(defaultState({ carregando: true, aluno: null, reservaAtiva: null }))
    render(<ComprovantePage />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('não exibe spinner quando carregando=false', () => {
    render(<ComprovantePage />)
    expect(screen.queryByTestId('spinner')).not.toBeInTheDocument()
  })
})

// ── Empty state ───────────────────────────────────────────────────────────────

describe('ComprovantePage — empty state', () => {
  it('exibe empty state quando não há reserva ativa', () => {
    mockUseReserva.mockReturnValue(defaultState({ reservaAtiva: null }))
    render(<ComprovantePage />)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  it('exibe mensagem de empty state', () => {
    mockUseReserva.mockReturnValue(defaultState({ reservaAtiva: null }))
    render(<ComprovantePage />)
    expect(screen.getByText(/nenhuma reserva ativa/i)).toBeInTheDocument()
  })

  it('não exibe header quando não há reserva', () => {
    mockUseReserva.mockReturnValue(defaultState({ reservaAtiva: null }))
    render(<ComprovantePage />)
    expect(screen.queryByText('Luana Beatriz')).not.toBeInTheDocument()
  })
})

// ── Header azul ───────────────────────────────────────────────────────────────

describe('ComprovantePage — header azul', () => {
  it('exibe as iniciais do aluno no avatar', () => {
    render(<ComprovantePage />)
    expect(screen.getByTestId('avatar-iniciais')).toHaveTextContent('LB')
  })

  it('exibe o nome do aluno', () => {
    render(<ComprovantePage />)
    expect(screen.getByText('Luana Beatriz')).toBeInTheDocument()
  })

  it('exibe faculdade e curso no header', () => {
    render(<ComprovantePage />)
    expect(screen.getByText(/Direito/)).toBeInTheDocument()
    expect(screen.getByText(/Uninassau/)).toBeInTheDocument()
  })

  it('exibe badge "Reserva confirmada"', () => {
    render(<ComprovantePage />)
    expect(screen.getByText(/reserva confirmada/i)).toBeInTheDocument()
  })

  it('iniciais usam apenas as duas primeiras palavras do nome', () => {
    mockUseReserva.mockReturnValue(defaultState({
      aluno: { ...mockAluno, nome: 'Carlos Eduardo Souza' },
    }))
    render(<ComprovantePage />)
    expect(screen.getByTestId('avatar-iniciais')).toHaveTextContent('CE')
  })
})

// ── Linhas de informação ──────────────────────────────────────────────────────

describe('ComprovantePage — informações da reserva', () => {
  it('exibe a data de viagem formatada (DD/MM/YYYY)', () => {
    render(<ComprovantePage />)
    expect(screen.getByText('16/01/2024')).toBeInTheDocument()
  })

  it('exibe o horário de criação da reserva (HH:mm)', () => {
    render(<ComprovantePage />)
    expect(screen.getByText('18:30')).toBeInTheDocument()
  })

  it('exibe o ponto de embarque escolhido', () => {
    render(<ComprovantePage />)
    expect(screen.getByText('Terminal Norte')).toBeInTheDocument()
  })

  it('exibe o semestre do aluno', () => {
    render(<ComprovantePage />)
    expect(screen.getByText(/3º/)).toBeInTheDocument()
  })

  it('exibe o telefone do aluno', () => {
    render(<ComprovantePage />)
    expect(screen.getByText('(82) 99999-9999')).toBeInTheDocument()
  })

  it('exibe a modalidade do aluno', () => {
    render(<ComprovantePage />)
    expect(screen.getByText(/presencial/i)).toBeInTheDocument()
  })
})

// ── QR Code ───────────────────────────────────────────────────────────────────

describe('ComprovantePage — QR code', () => {
  it('renderiza o QR code', () => {
    render(<ComprovantePage />)
    expect(screen.getByTestId('qrcode')).toBeInTheDocument()
  })

  it('usa o id da reserva como valor do QR code', () => {
    render(<ComprovantePage />)
    expect(screen.getByTestId('qrcode')).toHaveAttribute('data-value', 'reserva-abc-123')
  })

  it('exibe o texto de instrução do QR code', () => {
    render(<ComprovantePage />)
    expect(screen.getByText(/apresente ao motorista/i)).toBeInTheDocument()
  })

  it('exibe o label "Comprovante de embarque"', () => {
    render(<ComprovantePage />)
    expect(screen.getByText(/comprovante de embarque/i)).toBeInTheDocument()
  })
})
