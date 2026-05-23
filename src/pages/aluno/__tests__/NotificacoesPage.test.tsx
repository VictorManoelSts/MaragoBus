import { render, screen } from '@testing-library/react'
import { NotificacoesPage } from '@/pages/aluno/NotificacoesPage'
import { TipoNotificacao } from '@/types/notificacao'
import type { Notificacao } from '@/types/notificacao'
import type { Timestamp } from 'firebase/firestore'

const mockMarcarTodasComoLidas = jest.fn()
const mockUseNotificacoes = jest.fn()

jest.mock('@/hooks/useNotificacoes', () => ({
  useNotificacoes: () => mockUseNotificacoes(),
}))

function makeTimestamp(dateStr: string): Timestamp {
  return { toDate: () => new Date(dateStr) } as unknown as Timestamp
}

function makeNotif(overrides: Partial<Notificacao> = {}): Notificacao {
  return {
    id: 'n1', alunoId: 'u1',
    tipo: TipoNotificacao.AberturaReservas,
    titulo: 'Reservas abertas', mensagem: 'As reservas de amanhã estão abertas.',
    lida: false, criadaEm: makeTimestamp('2024-01-15T18:00:00'),
    ...overrides,
  }
}

function defaultState(overrides = {}) {
  return {
    notificacoes: [],
    naoLidas: 0,
    carregando: false,
    marcarTodasComoLidas: mockMarcarTodasComoLidas,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockMarcarTodasComoLidas.mockResolvedValue(undefined)
  mockUseNotificacoes.mockReturnValue(defaultState())
})

// ── Carregamento ──────────────────────────────────────────────────────────────

describe('NotificacoesPage — carregamento', () => {
  it('exibe spinner quando carregando=true', () => {
    mockUseNotificacoes.mockReturnValue(defaultState({ carregando: true }))
    render(<NotificacoesPage />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('não exibe spinner quando carregando=false', () => {
    render(<NotificacoesPage />)
    expect(screen.queryByTestId('spinner')).not.toBeInTheDocument()
  })
})

// ── Empty state ───────────────────────────────────────────────────────────────

describe('NotificacoesPage — empty state', () => {
  it('exibe empty state quando não há notificações', () => {
    render(<NotificacoesPage />)
    expect(screen.getByTestId('empty-notificacoes')).toBeInTheDocument()
  })

  it('exibe mensagem de empty state', () => {
    render(<NotificacoesPage />)
    expect(screen.getByText(/nenhuma notificação/i)).toBeInTheDocument()
  })

  it('não exibe empty state quando há notificações', () => {
    mockUseNotificacoes.mockReturnValue(defaultState({ notificacoes: [makeNotif()] }))
    render(<NotificacoesPage />)
    expect(screen.queryByTestId('empty-notificacoes')).not.toBeInTheDocument()
  })
})

// ── Lista de notificações ─────────────────────────────────────────────────────

describe('NotificacoesPage — lista', () => {
  it('exibe o título de cada notificação', () => {
    mockUseNotificacoes.mockReturnValue(defaultState({
      notificacoes: [
        makeNotif({ id: 'n1', titulo: 'Reservas abertas' }),
        makeNotif({ id: 'n2', titulo: 'Você recebeu uma advertência' }),
      ],
    }))
    render(<NotificacoesPage />)
    expect(screen.getByText('Reservas abertas')).toBeInTheDocument()
    expect(screen.getByText('Você recebeu uma advertência')).toBeInTheDocument()
  })

  it('exibe a mensagem de cada notificação', () => {
    mockUseNotificacoes.mockReturnValue(defaultState({
      notificacoes: [makeNotif({ mensagem: 'As reservas de amanhã estão abertas.' })],
    }))
    render(<NotificacoesPage />)
    expect(screen.getByText('As reservas de amanhã estão abertas.')).toBeInTheDocument()
  })

  it('exibe a data de cada notificação', () => {
    mockUseNotificacoes.mockReturnValue(defaultState({
      notificacoes: [makeNotif({ criadaEm: makeTimestamp('2024-01-15T18:00:00') })],
    }))
    render(<NotificacoesPage />)
    expect(screen.getByText('15/01/2024')).toBeInTheDocument()
  })

  it('notificação não lida tem indicador visual (data-unread)', () => {
    mockUseNotificacoes.mockReturnValue(defaultState({
      notificacoes: [makeNotif({ lida: false })],
    }))
    render(<NotificacoesPage />)
    expect(screen.getByTestId('notif-n1')).toHaveAttribute('data-unread', 'true')
  })

  it('notificação lida não tem indicador de não lida', () => {
    mockUseNotificacoes.mockReturnValue(defaultState({
      notificacoes: [makeNotif({ id: 'n1', lida: true })],
    }))
    render(<NotificacoesPage />)
    expect(screen.getByTestId('notif-n1')).toHaveAttribute('data-unread', 'false')
  })
})

// ── Ícones por tipo ───────────────────────────────────────────────────────────

describe('NotificacoesPage — ícones por tipo', () => {
  const casos: Array<[TipoNotificacao, string]> = [
    [TipoNotificacao.AberturaReservas,    'icone-abertura_reservas'],
    [TipoNotificacao.LembreteEncerramento,'icone-lembrete_encerramento'],
    [TipoNotificacao.SuspensaoConfirmada, 'icone-suspensao_confirmada'],
    [TipoNotificacao.AvisoFeriado,        'icone-aviso_feriado'],
    [TipoNotificacao.Advertencia,         'icone-advertencia'],
  ]
  it.each(casos)('exibe ícone correto para tipo %s', (tipo, testId) => {
    mockUseNotificacoes.mockReturnValue(defaultState({
      notificacoes: [makeNotif({ id: 'n1', tipo })],
    }))
    render(<NotificacoesPage />)
    expect(screen.getByTestId(testId)).toBeInTheDocument()
  })
})

// ── Marcar como lida ──────────────────────────────────────────────────────────

describe('NotificacoesPage — marcar como lida', () => {
  it('chama marcarTodasComoLidas ao montar a página', () => {
    mockUseNotificacoes.mockReturnValue(defaultState({
      notificacoes: [makeNotif({ lida: false })],
    }))
    render(<NotificacoesPage />)
    expect(mockMarcarTodasComoLidas).toHaveBeenCalledTimes(1)
  })
})
