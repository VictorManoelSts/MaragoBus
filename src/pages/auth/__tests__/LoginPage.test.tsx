import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from '@/pages/auth/LoginPage'
import { authService } from '@/services/authService'

const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('@/services/authService', () => ({
  authService: { login: jest.fn() },
}))

const mockLogin = authService.login as jest.Mock

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('LoginPage — renderização', () => {
  it('exibe logo, título MaragoBus e subtítulo', () => {
    renderLogin()
    expect(screen.getByAltText('Prefeitura de Maragogi')).toBeInTheDocument()
    expect(screen.getByText('MaragoBus')).toBeInTheDocument()
    expect(screen.getByText('Transporte Universitário')).toBeInTheDocument()
  })

  it('exibe os 3 chips de perfil', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /aluno/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /motorista/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /admin/i })).toBeInTheDocument()
  })

  it('chip Aluno está ativo por padrão', () => {
    renderLogin()
    const chipAluno = screen.getByRole('button', { name: /aluno/i })
    expect(chipAluno.className).toMatch(/bg-primary/)
    expect(chipAluno.className).not.toMatch(/bg-primary-light/)
  })

  it('exibe campo CPF e campo Senha', () => {
    renderLogin()
    expect(screen.getByLabelText(/cpf/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
  })

  it('exibe botão Entrar', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('link "Esqueceu a senha?" aponta para o WhatsApp da secretaria', () => {
    renderLogin()
    const link = screen.getByRole('link', { name: /esqueceu a senha/i })
    expect(link).toHaveAttribute('href', 'https://wa.me/5582991512687')
  })
})

describe('LoginPage — interação com chips', () => {
  it('click em Motorista ativa esse chip e desativa Aluno', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /motorista/i }))

    const chipMotorista = screen.getByRole('button', { name: /motorista/i })
    const chipAluno = screen.getByRole('button', { name: /aluno/i })
    expect(chipMotorista.className).toMatch(/bg-primary/)
    expect(chipMotorista.className).not.toMatch(/bg-primary-light/)
    expect(chipAluno.className).toMatch(/bg-primary-light/)
  })

  it('click em Admin ativa esse chip', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /admin/i }))

    const chipAdmin = screen.getByRole('button', { name: /admin/i })
    expect(chipAdmin.className).toMatch(/bg-primary/)
    expect(chipAdmin.className).not.toMatch(/bg-primary-light/)
  })
})

describe('LoginPage — validação de formulário', () => {
  it('submit com CPF vazio exibe "Campo obrigatório"', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(screen.getAllByText('Campo obrigatório').length).toBeGreaterThanOrEqual(1)
  })

  it('submit com senha vazia exibe "Campo obrigatório"', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(/cpf/i), '12345678901')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(screen.getByText('Campo obrigatório')).toBeInTheDocument()
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('CPF com menos de 11 dígitos exibe mensagem de CPF inválido', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(/cpf/i), '1234567')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(
      screen.getByText('CPF inválido. Verifique e tente novamente')
    ).toBeInTheDocument()
    expect(mockLogin).not.toHaveBeenCalled()
  })
})

describe('LoginPage — loading', () => {
  it('botão fica desabilitado enquanto o login está em andamento', async () => {
    const user = userEvent.setup()
    mockLogin.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ uid: '1', perfil: 'aluno', primeiroAcesso: false }), 200))
    )
    renderLogin()

    await user.type(screen.getByLabelText(/cpf/i), '12345678901')
    await user.type(screen.getByLabelText(/senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(screen.getByRole('button', { name: /entrar/i })).toBeDisabled()

    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1))
  })
})

describe('LoginPage — erro de autenticação', () => {
  it('exibe a mensagem de erro retornada pelo authService', async () => {
    const user = userEvent.setup()
    mockLogin.mockRejectedValue(new Error('Senha incorreta.'))
    renderLogin()

    await user.type(screen.getByLabelText(/cpf/i), '12345678901')
    await user.type(screen.getByLabelText(/senha/i), 'errada')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() =>
      expect(screen.getByText('Senha incorreta.')).toBeInTheDocument()
    )
  })
})

describe('LoginPage — navegação após login', () => {
  it('navega para /primeiro-acesso quando primeiroAcesso é true', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue({ uid: '1', perfil: 'aluno', primeiroAcesso: true })
    renderLogin()

    await user.type(screen.getByLabelText(/cpf/i), '12345678901')
    await user.type(screen.getByLabelText(/senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/primeiro-acesso'))
  })

  it('navega para /aluno quando perfil é aluno e primeiroAcesso é false', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue({ uid: '1', perfil: 'aluno', primeiroAcesso: false })
    renderLogin()

    await user.type(screen.getByLabelText(/cpf/i), '12345678901')
    await user.type(screen.getByLabelText(/senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/aluno'))
  })

  it('navega para /motorista quando perfil é motorista', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue({ uid: '1', perfil: 'motorista', primeiroAcesso: false })
    renderLogin()

    await user.type(screen.getByLabelText(/cpf/i), '12345678901')
    await user.type(screen.getByLabelText(/senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/motorista'))
  })

  it('navega para /admin quando perfil é admin', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue({ uid: '1', perfil: 'admin', primeiroAcesso: false })
    renderLogin()

    await user.type(screen.getByLabelText(/cpf/i), '12345678901')
    await user.type(screen.getByLabelText(/senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin'))
  })
})
