import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { FirstAccessPage } from '@/pages/auth/FirstAccessPage'
import { authService } from '@/services/authService'

const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('@/services/authService', () => ({
  authService: { trocarSenhaInicial: jest.fn() },
}))

const mockTrocar = authService.trocarSenhaInicial as jest.Mock

function renderPage() {
  return render(
    <MemoryRouter>
      <FirstAccessPage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('FirstAccessPage — renderização', () => {
  it('exibe logo, título MaragoBus e subtítulo', () => {
    renderPage()
    expect(screen.getByAltText('Prefeitura de Maragogi')).toBeInTheDocument()
    expect(screen.getByText('MaragoBus')).toBeInTheDocument()
    expect(screen.getByText('Transporte Universitário')).toBeInTheDocument()
  })

  it('exibe campo de nova senha', () => {
    renderPage()
    expect(screen.getByLabelText(/nova senha/i)).toBeInTheDocument()
  })

  it('exibe campo de confirmar senha', () => {
    renderPage()
    expect(screen.getByLabelText(/confirmar senha/i)).toBeInTheDocument()
  })

  it('exibe botão de confirmar', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument()
  })

  it('os campos de senha são do tipo password', () => {
    renderPage()
    expect(screen.getByLabelText(/nova senha/i)).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText(/confirmar senha/i)).toHaveAttribute('type', 'password')
  })
})

describe('FirstAccessPage — validação de formulário', () => {
  it('submit com nova senha vazia exibe "Campo obrigatório"', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /confirmar/i }))

    expect(screen.getAllByText('Campo obrigatório').length).toBeGreaterThanOrEqual(1)
    expect(mockTrocar).not.toHaveBeenCalled()
  })

  it('nova senha com menos de 6 caracteres exibe erro de mínimo', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/nova senha/i), 'abc')
    await user.click(screen.getByRole('button', { name: /confirmar/i }))

    expect(screen.getByText('Mínimo de 6 caracteres')).toBeInTheDocument()
    expect(mockTrocar).not.toHaveBeenCalled()
  })

  it('submit com confirmar senha vazia exibe "Campo obrigatório"', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/nova senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: /confirmar/i }))

    expect(screen.getByText('Campo obrigatório')).toBeInTheDocument()
    expect(mockTrocar).not.toHaveBeenCalled()
  })

  it('senhas diferentes exibem "As senhas não coincidem"', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/nova senha/i), 'senha123')
    await user.type(screen.getByLabelText(/confirmar senha/i), 'diferente')
    await user.click(screen.getByRole('button', { name: /confirmar/i }))

    expect(screen.getByText('As senhas não coincidem')).toBeInTheDocument()
    expect(mockTrocar).not.toHaveBeenCalled()
  })

  it('submit válido chama authService.trocarSenhaInicial com a nova senha', async () => {
    const user = userEvent.setup()
    mockTrocar.mockResolvedValue('aluno')
    renderPage()

    await user.type(screen.getByLabelText(/nova senha/i), 'novaSenha1')
    await user.type(screen.getByLabelText(/confirmar senha/i), 'novaSenha1')
    await user.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() =>
      expect(mockTrocar).toHaveBeenCalledWith('novaSenha1')
    )
  })
})

describe('FirstAccessPage — loading', () => {
  it('botão fica desabilitado enquanto a troca está em andamento', async () => {
    const user = userEvent.setup()
    mockTrocar.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve('aluno'), 200)
        )
    )
    renderPage()

    await user.type(screen.getByLabelText(/nova senha/i), 'novaSenha1')
    await user.type(screen.getByLabelText(/confirmar senha/i), 'novaSenha1')
    await user.click(screen.getByRole('button', { name: /confirmar/i }))

    expect(screen.getByRole('button', { name: /confirmar/i })).toBeDisabled()

    await waitFor(() => expect(mockTrocar).toHaveBeenCalledTimes(1))
  })
})

describe('FirstAccessPage — erro do serviço', () => {
  it('exibe mensagem de erro retornada pelo authService', async () => {
    const user = userEvent.setup()
    mockTrocar.mockRejectedValue(new Error('Sessão expirada. Faça login novamente.'))
    renderPage()

    await user.type(screen.getByLabelText(/nova senha/i), 'novaSenha1')
    await user.type(screen.getByLabelText(/confirmar senha/i), 'novaSenha1')
    await user.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() =>
      expect(
        screen.getByText('Sessão expirada. Faça login novamente.')
      ).toBeInTheDocument()
    )
  })
})

describe('FirstAccessPage — navegação após troca', () => {
  it('navega para /aluno quando perfil é aluno', async () => {
    const user = userEvent.setup()
    mockTrocar.mockResolvedValue('aluno')
    renderPage()

    await user.type(screen.getByLabelText(/nova senha/i), 'novaSenha1')
    await user.type(screen.getByLabelText(/confirmar senha/i), 'novaSenha1')
    await user.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/aluno'))
  })

  it('navega para /motorista quando perfil é motorista', async () => {
    const user = userEvent.setup()
    mockTrocar.mockResolvedValue('motorista')
    renderPage()

    await user.type(screen.getByLabelText(/nova senha/i), 'novaSenha1')
    await user.type(screen.getByLabelText(/confirmar senha/i), 'novaSenha1')
    await user.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/motorista'))
  })

  it('navega para /admin quando perfil é admin', async () => {
    const user = userEvent.setup()
    mockTrocar.mockResolvedValue('admin')
    renderPage()

    await user.type(screen.getByLabelText(/nova senha/i), 'novaSenha1')
    await user.type(screen.getByLabelText(/confirmar senha/i), 'novaSenha1')
    await user.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin'))
  })
})
