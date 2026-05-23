import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CadastroAlunoPage } from '@/pages/admin/CadastroAlunoPage'
import { ModalidadeAluno } from '@/types/aluno'
import type { UseCadastroAlunoReturn } from '@/hooks/useCadastroAluno'
import type { Ponto } from '@/types/ponto'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSalvar = jest.fn()
const mockUseCadastroAluno = jest.fn()

jest.mock('@/hooks/useCadastroAluno', () => ({
  useCadastroAluno: (...args: unknown[]) => mockUseCadastroAluno(...args),
}))

const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PONTOS: Ponto[] = [
  { id: 'p1', nome: 'Ponto Central', ativo: true },
  { id: 'p2', nome: 'Ponto Norte',   ativo: true },
]

function defaultState(overrides: Partial<UseCadastroAlunoReturn> = {}): UseCadastroAlunoReturn {
  return {
    pontos: PONTOS,
    carregandoPontos: false,
    salvando: false,
    salvar: mockSalvar,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseCadastroAluno.mockReturnValue(defaultState())
  mockSalvar.mockResolvedValue(undefined)
})

// ── Renderização das seções ───────────────────────────────────────────────────

describe('CadastroAlunoPage — renderização', () => {
  it('exibe área de upload de foto', () => {
    render(<CadastroAlunoPage />)
    expect(screen.getByText('Adicionar foto')).toBeInTheDocument()
  })

  it('exibe seção de dados pessoais', () => {
    render(<CadastroAlunoPage />)
    expect(screen.getByText('Dados pessoais')).toBeInTheDocument()
  })

  it('exibe campo nome', () => {
    render(<CadastroAlunoPage />)
    expect(screen.getByLabelText(/Nome completo/i)).toBeInTheDocument()
  })

  it('exibe campo CPF', () => {
    render(<CadastroAlunoPage />)
    expect(screen.getByLabelText(/CPF/i)).toBeInTheDocument()
  })

  it('exibe campo senha inicial', () => {
    render(<CadastroAlunoPage />)
    expect(screen.getByLabelText(/Senha inicial/i)).toBeInTheDocument()
  })

  it('exibe campo telefone', () => {
    render(<CadastroAlunoPage />)
    expect(screen.getByLabelText(/Telefone/i)).toBeInTheDocument()
  })

  it('exibe campo endereço', () => {
    render(<CadastroAlunoPage />)
    expect(screen.getByLabelText(/Endereço/i)).toBeInTheDocument()
  })

  it('exibe seção de dados acadêmicos', () => {
    render(<CadastroAlunoPage />)
    expect(screen.getByText('Dados acadêmicos')).toBeInTheDocument()
  })

  it('exibe chips de faculdade', () => {
    render(<CadastroAlunoPage />)
    expect(screen.getByRole('button', { name: 'UFAL' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Uninassau' })).toBeInTheDocument()
  })

  it('exibe chips de curso', () => {
    render(<CadastroAlunoPage />)
    expect(screen.getByRole('button', { name: 'Direito' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enfermagem' })).toBeInTheDocument()
  })

  it('exibe chips de modalidade', () => {
    render(<CadastroAlunoPage />)
    expect(screen.getByRole('button', { name: 'Presencial' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Semipresencial' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Online' })).toBeInTheDocument()
  })

  it('exibe seção de ponto de embarque', () => {
    render(<CadastroAlunoPage />)
    expect(screen.getByText('Ponto de embarque')).toBeInTheDocument()
  })

  it('exibe os pontos de embarque como opções', () => {
    render(<CadastroAlunoPage />)
    expect(screen.getByText('Ponto Central')).toBeInTheDocument()
    expect(screen.getByText('Ponto Norte')).toBeInTheDocument()
  })

  it('exibe botão voltar', () => {
    render(<CadastroAlunoPage />)
    expect(screen.getByRole('button', { name: /voltar/i })).toBeInTheDocument()
  })

  it('exibe botão cadastrar', () => {
    render(<CadastroAlunoPage />)
    expect(screen.getByRole('button', { name: /cadastrar/i })).toBeInTheDocument()
  })
})

// ── Spinner ───────────────────────────────────────────────────────────────────

describe('CadastroAlunoPage — carregamento de pontos', () => {
  it('exibe spinner quando carregandoPontos=true', () => {
    mockUseCadastroAluno.mockReturnValue(defaultState({ carregandoPontos: true }))
    render(<CadastroAlunoPage />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('não exibe pontos quando carregandoPontos=true', () => {
    mockUseCadastroAluno.mockReturnValue(defaultState({ carregandoPontos: true, pontos: PONTOS }))
    render(<CadastroAlunoPage />)
    expect(screen.queryByText('Ponto Central')).not.toBeInTheDocument()
  })
})

// ── Interação — chips ─────────────────────────────────────────────────────────

describe('CadastroAlunoPage — chips de seleção', () => {
  it('faculdade selecionada fica com aria-pressed=true', () => {
    render(<CadastroAlunoPage />)
    const chip = screen.getByRole('button', { name: 'UFAL' })
    fireEvent.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'true')
  })

  it('apenas uma faculdade pode ser selecionada por vez', () => {
    render(<CadastroAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: 'UFAL' }))
    fireEvent.click(screen.getByRole('button', { name: 'Uninassau' }))
    expect(screen.getByRole('button', { name: 'UFAL' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Uninassau' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('curso selecionado fica com aria-pressed=true', () => {
    render(<CadastroAlunoPage />)
    const chip = screen.getByRole('button', { name: 'Direito' })
    fireEvent.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'true')
  })

  it('modalidade selecionada fica com aria-pressed=true', () => {
    render(<CadastroAlunoPage />)
    const chip = screen.getByRole('button', { name: 'Online' })
    fireEvent.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'true')
  })

  it('Presencial é a modalidade inicial selecionada', () => {
    render(<CadastroAlunoPage />)
    expect(screen.getByRole('button', { name: 'Presencial' })).toHaveAttribute('aria-pressed', 'true')
  })
})

// ── Interação — ponto de embarque ─────────────────────────────────────────────

describe('CadastroAlunoPage — ponto de embarque', () => {
  it('clique no ponto o seleciona', () => {
    render(<CadastroAlunoPage />)
    fireEvent.click(screen.getByText('Ponto Central'))
    const botao = screen.getByText('Ponto Central').closest('button')!
    expect(botao).toHaveClass('bg-primary-light')
  })

  it('apenas um ponto pode ser selecionado', () => {
    render(<CadastroAlunoPage />)
    fireEvent.click(screen.getByText('Ponto Central'))
    fireEvent.click(screen.getByText('Ponto Norte'))
    expect(screen.getByText('Ponto Central').closest('button')).not.toHaveClass('bg-primary-light')
    expect(screen.getByText('Ponto Norte').closest('button')).toHaveClass('bg-primary-light')
  })
})

// ── Navegação ─────────────────────────────────────────────────────────────────

describe('CadastroAlunoPage — navegação', () => {
  it('botão voltar navega para /admin/alunos', () => {
    render(<CadastroAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/admin/alunos')
  })
})

// ── Validação ─────────────────────────────────────────────────────────────────

describe('CadastroAlunoPage — validação', () => {
  it('não chama salvar quando campos obrigatórios estão vazios', async () => {
    render(<CadastroAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }))
    await waitFor(() => expect(mockSalvar).not.toHaveBeenCalled())
  })

  it('exibe erro de nome obrigatório', async () => {
    render(<CadastroAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }))
    await waitFor(() => expect(screen.getByText(/nome é obrigatório/i)).toBeInTheDocument())
  })

  it('exibe erro de CPF obrigatório', async () => {
    render(<CadastroAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }))
    await waitFor(() => expect(screen.getByText(/cpf é obrigatório/i)).toBeInTheDocument())
  })

  it('exibe erro de CPF inválido quando tem menos de 11 dígitos', async () => {
    render(<CadastroAlunoPage />)
    fireEvent.change(screen.getByLabelText(/Nome completo/i), { target: { value: 'Alice Santos' } })
    fireEvent.change(screen.getByLabelText(/CPF/i), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }))
    await waitFor(() => expect(screen.getByText(/cpf inválido/i)).toBeInTheDocument())
  })

  it('exibe erro de ponto obrigatório', async () => {
    render(<CadastroAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }))
    await waitFor(() => expect(screen.getByText(/selecione um ponto/i)).toBeInTheDocument())
  })

  it('exibe erro de faculdade obrigatória', async () => {
    render(<CadastroAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }))
    await waitFor(() => expect(screen.getByText(/selecione uma faculdade/i)).toBeInTheDocument())
  })

  it('exibe erro de curso obrigatório', async () => {
    render(<CadastroAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }))
    await waitFor(() => expect(screen.getByText(/selecione um curso/i)).toBeInTheDocument())
  })

  it('exibe erro de senha obrigatória', async () => {
    render(<CadastroAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }))
    await waitFor(() => expect(screen.getByText(/senha.*obrigatória/i)).toBeInTheDocument())
  })
})

// ── Submissão ─────────────────────────────────────────────────────────────────

function preencherFormulario() {
  fireEvent.change(screen.getByLabelText(/Nome completo/i), { target: { value: 'Alice Santos' } })
  fireEvent.change(screen.getByLabelText(/CPF/i), { target: { value: '12345678901' } })
  fireEvent.change(screen.getByLabelText(/Senha inicial/i), { target: { value: '789901' } })
  fireEvent.change(screen.getByLabelText(/Telefone/i), { target: { value: '(82) 99999-0000' } })
  fireEvent.change(screen.getByLabelText(/Endereço/i), { target: { value: 'Rua das Flores, 100' } })
  fireEvent.change(screen.getByLabelText(/Semestre/i), { target: { value: '3' } })
  fireEvent.change(screen.getByLabelText(/Ano de conclusão/i), { target: { value: '2027' } })
  fireEvent.click(screen.getByRole('button', { name: 'UFAL' }))
  fireEvent.click(screen.getByRole('button', { name: 'Direito' }))
  fireEvent.click(screen.getByText('Ponto Central'))
}

describe('CadastroAlunoPage — submissão', () => {
  it('chama salvar com os dados preenchidos', async () => {
    render(<CadastroAlunoPage />)
    preencherFormulario()
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }))

    await waitFor(() => expect(mockSalvar).toHaveBeenCalledWith(expect.objectContaining({
      nome: 'Alice Santos',
      cpf: '12345678901',
      senha: '789901',
      faculdade: 'UFAL',
      curso: 'Direito',
      modalidade: ModalidadeAluno.Presencial,
      pontoEmbarquePadrao: 'Ponto Central',
    })))
  })

  it('navega para /admin/alunos após salvar com sucesso', async () => {
    render(<CadastroAlunoPage />)
    preencherFormulario()
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin/alunos'))
  })

  it('exibe mensagem de erro quando salvar falha', async () => {
    mockSalvar.mockRejectedValue(new Error('CPF já cadastrado'))
    render(<CadastroAlunoPage />)
    preencherFormulario()
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }))

    await waitFor(() => expect(screen.getByText(/cpf já cadastrado/i)).toBeInTheDocument())
  })

  it('não navega quando salvar falha', async () => {
    mockSalvar.mockRejectedValue(new Error('Erro'))
    render(<CadastroAlunoPage />)
    preencherFormulario()
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }))

    await waitFor(() => expect(screen.getByText(/erro/i)).toBeInTheDocument())
    expect(mockNavigate).not.toHaveBeenCalledWith('/admin/alunos')
  })

  it('botão cadastrar fica desabilitado quando salvando=true', () => {
    mockUseCadastroAluno.mockReturnValue(defaultState({ salvando: true }))
    render(<CadastroAlunoPage />)
    expect(screen.getByRole('button', { name: /cadastrar/i })).toBeDisabled()
  })
})
