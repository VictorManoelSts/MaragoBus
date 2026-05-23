import { render, screen, fireEvent } from '@testing-library/react'
import { AlunoLayout } from '@/layouts/AlunoLayout'
import { TipoAdvertencia } from '@/types/advertencia'
import type { Advertencia } from '@/types/advertencia'
import type { Timestamp } from 'firebase/firestore'

const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({
  Outlet: () => <div data-testid="outlet" />,
  useNavigate: () => mockNavigate,
}))

const mockFechar = jest.fn()
const mockUseSuspensaoModal = jest.fn()
const mockUseNotificacoes = jest.fn()

jest.mock('@/hooks/useSuspensaoModal', () => ({
  useSuspensaoModal: () => mockUseSuspensaoModal(),
}))

jest.mock('@/hooks/useNotificacoes', () => ({
  useNotificacoes: () => mockUseNotificacoes(),
}))

const mockAdvertencias: Advertencia[] = [
  {
    id: 'a1', alunoId: 'u1', motivo: 'Falta sem aviso',
    aplicadaPor: 'admin', tipo: TipoAdvertencia.Direta,
    data: { toDate: () => new Date('2025-05-01') } as unknown as Timestamp,
  },
]

function defaultSuspensaoState(overrides = {}) {
  return {
    mostrar: false, advertencias: [], dataReativacao: null,
    carregando: false, fechar: mockFechar, ...overrides,
  }
}

function defaultNotifState(overrides = {}) {
  return { notificacoes: [], naoLidas: 0, carregando: false, marcarTodasComoLidas: jest.fn(), ...overrides }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseSuspensaoModal.mockReturnValue(defaultSuspensaoState())
  mockUseNotificacoes.mockReturnValue(defaultNotifState())
})

// ── Estrutura base ─────────────────────────────────────────────────────────────

describe('AlunoLayout — estrutura base', () => {
  it('renderiza o Outlet', () => {
    render(<AlunoLayout />)
    expect(screen.getByTestId('outlet')).toBeInTheDocument()
  })

  it('exibe a logo bar', () => {
    render(<AlunoLayout />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('exibe a logo na logo bar', () => {
    render(<AlunoLayout />)
    expect(screen.getByRole('img', { name: /maragogi/i })).toBeInTheDocument()
  })

  it('não exibe modal quando aluno não está suspenso', () => {
    render(<AlunoLayout />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

// ── Sino de notificações ───────────────────────────────────────────────────────

describe('AlunoLayout — sino de notificações', () => {
  it('exibe o botão de notificações', () => {
    render(<AlunoLayout />)
    expect(screen.getByRole('button', { name: /notificações/i })).toBeInTheDocument()
  })

  it('não exibe badge quando naoLidas=0', () => {
    render(<AlunoLayout />)
    expect(screen.queryByTestId('badge-notif')).not.toBeInTheDocument()
  })

  it('exibe badge com contagem quando há não lidas', () => {
    mockUseNotificacoes.mockReturnValue(defaultNotifState({ naoLidas: 3 }))
    render(<AlunoLayout />)
    expect(screen.getByTestId('badge-notif')).toHaveTextContent('3')
  })

  it('navega para /aluno/notificacoes ao clicar no sino', () => {
    render(<AlunoLayout />)
    fireEvent.click(screen.getByRole('button', { name: /notificações/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/aluno/notificacoes')
  })
})

// ── Modal de suspensão ─────────────────────────────────────────────────────────

describe('AlunoLayout — modal de suspensão', () => {
  it('exibe SuspensaoModal quando mostrar=true', () => {
    mockUseSuspensaoModal.mockReturnValue(defaultSuspensaoState({
      mostrar: true, advertencias: mockAdvertencias, dataReativacao: '2025-05-28',
    }))
    render(<AlunoLayout />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Acesso suspenso')).toBeInTheDocument()
  })

  it('exibe a data de reativação no modal', () => {
    mockUseSuspensaoModal.mockReturnValue(defaultSuspensaoState({
      mostrar: true, advertencias: mockAdvertencias, dataReativacao: '2025-05-28',
    }))
    render(<AlunoLayout />)
    expect(screen.getByText('Reativação em: 28/05/2025')).toBeInTheDocument()
  })

  it('chama fechar ao clicar em "Entendido"', () => {
    mockUseSuspensaoModal.mockReturnValue(defaultSuspensaoState({
      mostrar: true, advertencias: mockAdvertencias, dataReativacao: '2025-05-28',
    }))
    render(<AlunoLayout />)
    fireEvent.click(screen.getByRole('button', { name: /entendido/i }))
    expect(mockFechar).toHaveBeenCalledTimes(1)
  })

  it('ainda renderiza o Outlet com o modal visível', () => {
    mockUseSuspensaoModal.mockReturnValue(defaultSuspensaoState({
      mostrar: true, advertencias: mockAdvertencias, dataReativacao: '2025-05-28',
    }))
    render(<AlunoLayout />)
    expect(screen.getByTestId('outlet')).toBeInTheDocument()
  })
})
