import { render, screen, fireEvent } from '@testing-library/react'
import { AlunoLayout } from '@/layouts/AlunoLayout'
import { TipoAdvertencia } from '@/types/advertencia'
import type { Advertencia } from '@/types/advertencia'
import type { Timestamp } from 'firebase/firestore'

jest.mock('react-router-dom', () => ({
  Outlet: () => <div data-testid="outlet" />,
}))

const mockFechar = jest.fn()
const mockUseSuspensaoModal = jest.fn()

jest.mock('@/hooks/useSuspensaoModal', () => ({
  useSuspensaoModal: () => mockUseSuspensaoModal(),
}))

const mockAdvertencias: Advertencia[] = [
  {
    id: 'a1', alunoId: 'u1', motivo: 'Falta sem aviso',
    aplicadaPor: 'admin', tipo: TipoAdvertencia.Direta,
    data: { toDate: () => new Date('2025-05-01') } as unknown as Timestamp,
  },
]

function defaultModalState(overrides = {}) {
  return {
    mostrar: false,
    advertencias: [],
    dataReativacao: null,
    carregando: false,
    fechar: mockFechar,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseSuspensaoModal.mockReturnValue(defaultModalState())
})

describe('AlunoLayout — estrutura base', () => {
  it('renderiza o Outlet', () => {
    render(<AlunoLayout />)
    expect(screen.getByTestId('outlet')).toBeInTheDocument()
  })

  it('não exibe modal quando aluno não está suspenso', () => {
    render(<AlunoLayout />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('AlunoLayout — modal de suspensão', () => {
  it('exibe SuspensaoModal quando mostrar=true', () => {
    mockUseSuspensaoModal.mockReturnValue(defaultModalState({
      mostrar: true,
      advertencias: mockAdvertencias,
      dataReativacao: '2025-05-28',
    }))
    render(<AlunoLayout />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Acesso suspenso')).toBeInTheDocument()
  })

  it('exibe a data de reativação no modal', () => {
    mockUseSuspensaoModal.mockReturnValue(defaultModalState({
      mostrar: true,
      advertencias: mockAdvertencias,
      dataReativacao: '2025-05-28',
    }))
    render(<AlunoLayout />)
    expect(screen.getByText('Reativação em: 28/05/2025')).toBeInTheDocument()
  })

  it('chama fechar ao clicar em "Entendido"', () => {
    mockUseSuspensaoModal.mockReturnValue(defaultModalState({
      mostrar: true,
      advertencias: mockAdvertencias,
      dataReativacao: '2025-05-28',
    }))
    render(<AlunoLayout />)
    fireEvent.click(screen.getByRole('button', { name: /entendido/i }))
    expect(mockFechar).toHaveBeenCalledTimes(1)
  })

  it('ainda renderiza o Outlet com o modal visível', () => {
    mockUseSuspensaoModal.mockReturnValue(defaultModalState({
      mostrar: true,
      advertencias: mockAdvertencias,
      dataReativacao: '2025-05-28',
    }))
    render(<AlunoLayout />)
    expect(screen.getByTestId('outlet')).toBeInTheDocument()
  })
})
