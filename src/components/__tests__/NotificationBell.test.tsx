import { render, screen, fireEvent } from '@testing-library/react'
import { NotificationBell } from '@/components/NotificationBell'

const mockOnClick = jest.fn()

beforeEach(() => jest.clearAllMocks())

describe('NotificationBell — estrutura', () => {
  it('renderiza o botão de notificações', () => {
    render(<NotificationBell naoLidas={0} onClick={mockOnClick} />)
    expect(screen.getByRole('button', { name: /notificações/i })).toBeInTheDocument()
  })

  it('tem aria-label acessível', () => {
    render(<NotificationBell naoLidas={0} onClick={mockOnClick} />)
    expect(screen.getByLabelText(/notificações/i)).toBeInTheDocument()
  })
})

describe('NotificationBell — badge', () => {
  it('exibe badge quando naoLidas > 0', () => {
    render(<NotificationBell naoLidas={3} onClick={mockOnClick} />)
    expect(screen.getByTestId('badge-notif')).toBeInTheDocument()
  })

  it('exibe o número correto de não lidas no badge', () => {
    render(<NotificationBell naoLidas={5} onClick={mockOnClick} />)
    expect(screen.getByTestId('badge-notif')).toHaveTextContent('5')
  })

  it('não exibe badge quando naoLidas = 0', () => {
    render(<NotificationBell naoLidas={0} onClick={mockOnClick} />)
    expect(screen.queryByTestId('badge-notif')).not.toBeInTheDocument()
  })
})

describe('NotificationBell — interação', () => {
  it('chama onClick ao clicar no botão', () => {
    render(<NotificationBell naoLidas={2} onClick={mockOnClick} />)
    fireEvent.click(screen.getByRole('button', { name: /notificações/i }))
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })
})
