import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EdicaoAlunoPage } from '@/pages/admin/EdicaoAlunoPage'
import { StatusAluno, ModalidadeAluno } from '@/types/aluno'
import type { Aluno } from '@/types/aluno'
import type { UseEdicaoAlunoReturn } from '@/hooks/useEdicaoAluno'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSalvar = jest.fn()
const mockUseEdicaoAluno = jest.fn()

jest.mock('@/hooks/useEdicaoAluno', () => ({
  useEdicaoAluno: (...args: unknown[]) => mockUseEdicaoAluno(...args),
}))

const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({
  useParams:   () => ({ id: 'a1' }),
  useNavigate: () => mockNavigate,
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeAluno(overrides: Partial<Aluno> = {}): Aluno {
  return {
    id: 'a1',
    nome: 'Alice Santos',
    cpf: '123.456.789-01',
    telefone: '(82) 99999-0000',
    endereco: 'Rua das Flores, 100',
    foto: null,
    faculdade: 'UFAL',
    curso: 'Direito',
    modalidade: ModalidadeAluno.Presencial,
    semestre: 3,
    anoConclusao: 2027,
    pontoEmbarquePadrao: 'Ponto Central',
    status: StatusAluno.Ativo,
    dataSuspensao: null,
    dataReativacao: null,
    primeiroAcesso: false,
    ...overrides,
  }
}

const ALUNO = makeAluno()

function defaultState(overrides: Partial<UseEdicaoAlunoReturn> = {}): UseEdicaoAlunoReturn {
  return {
    aluno: ALUNO,
    carregando: false,
    erro: null,
    salvando: false,
    salvar: mockSalvar,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseEdicaoAluno.mockReturnValue(defaultState())
  mockSalvar.mockResolvedValue(undefined)
})

// ── Estados de carregamento ───────────────────────────────────────────────────

describe('EdicaoAlunoPage — estados de carregamento', () => {
  it('exibe spinner quando carregando=true', () => {
    mockUseEdicaoAluno.mockReturnValue(defaultState({ carregando: true, aluno: null }))
    render(<EdicaoAlunoPage />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('não exibe formulário quando carregando=true', () => {
    mockUseEdicaoAluno.mockReturnValue(defaultState({ carregando: true, aluno: null }))
    render(<EdicaoAlunoPage />)
    expect(screen.queryByDisplayValue('Alice Santos')).not.toBeInTheDocument()
  })

  it('exibe mensagem de erro quando erro está definido', () => {
    mockUseEdicaoAluno.mockReturnValue(defaultState({ erro: 'Aluno não encontrado.', aluno: null }))
    render(<EdicaoAlunoPage />)
    expect(screen.getByText('Aluno não encontrado.')).toBeInTheDocument()
  })
})

// ── Navegação ─────────────────────────────────────────────────────────────────

describe('EdicaoAlunoPage — navegação', () => {
  it('exibe botão Voltar', () => {
    render(<EdicaoAlunoPage />)
    expect(screen.getByRole('button', { name: /voltar/i })).toBeInTheDocument()
  })

  it('clicar em Voltar navega para /admin/alunos/:id', () => {
    render(<EdicaoAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/admin/alunos/a1')
  })

  it('clicar em Cancelar navega para /admin/alunos/:id', () => {
    render(<EdicaoAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/admin/alunos/a1')
  })
})

// ── Campo CPF ─────────────────────────────────────────────────────────────────

describe('EdicaoAlunoPage — campo CPF', () => {
  it('campo CPF está desabilitado', () => {
    render(<EdicaoAlunoPage />)
    expect(screen.getByDisplayValue('123.456.789-01')).toBeDisabled()
  })

  it('campo CPF exibe o valor correto do aluno', () => {
    render(<EdicaoAlunoPage />)
    expect(screen.getByDisplayValue('123.456.789-01')).toBeInTheDocument()
  })
})

// ── Dados pessoais ────────────────────────────────────────────────────────────

describe('EdicaoAlunoPage — dados pessoais', () => {
  it('campo nome exibe o valor do aluno', () => {
    render(<EdicaoAlunoPage />)
    expect(screen.getByDisplayValue('Alice Santos')).toBeInTheDocument()
  })

  it('campo telefone exibe o valor do aluno', () => {
    render(<EdicaoAlunoPage />)
    expect(screen.getByDisplayValue('(82) 99999-0000')).toBeInTheDocument()
  })

  it('campo endereço exibe o valor do aluno', () => {
    render(<EdicaoAlunoPage />)
    expect(screen.getByDisplayValue('Rua das Flores, 100')).toBeInTheDocument()
  })
})

// ── Dados acadêmicos ──────────────────────────────────────────────────────────

describe('EdicaoAlunoPage — dados acadêmicos', () => {
  it('campo faculdade exibe o valor do aluno', () => {
    render(<EdicaoAlunoPage />)
    expect(screen.getByDisplayValue('UFAL')).toBeInTheDocument()
  })

  it('campo curso exibe o valor do aluno', () => {
    render(<EdicaoAlunoPage />)
    expect(screen.getByDisplayValue('Direito')).toBeInTheDocument()
  })

  it('chip Presencial está ativo quando modalidade é Presencial', () => {
    render(<EdicaoAlunoPage />)
    expect(screen.getByRole('button', { name: /^presencial$/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('chip Semipresencial não está ativo quando modalidade é Presencial', () => {
    render(<EdicaoAlunoPage />)
    expect(screen.getByRole('button', { name: /semipresencial/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('chip Online não está ativo quando modalidade é Presencial', () => {
    render(<EdicaoAlunoPage />)
    expect(screen.getByRole('button', { name: /^online$/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicar em chip Semipresencial muda a seleção', () => {
    render(<EdicaoAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /semipresencial/i }))
    expect(screen.getByRole('button', { name: /semipresencial/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^presencial$/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('campo semestre exibe o valor do aluno', () => {
    render(<EdicaoAlunoPage />)
    expect(screen.getByDisplayValue('3')).toBeInTheDocument()
  })

  it('campo anoConclusao exibe o valor do aluno', () => {
    render(<EdicaoAlunoPage />)
    expect(screen.getByDisplayValue('2027')).toBeInTheDocument()
  })
})

// ── Ponto de embarque padrão ──────────────────────────────────────────────────

describe('EdicaoAlunoPage — ponto de embarque', () => {
  it('campo ponto exibe o valor do aluno', () => {
    render(<EdicaoAlunoPage />)
    expect(screen.getByDisplayValue('Ponto Central')).toBeInTheDocument()
  })

  it('banner de aviso não aparece quando ponto não foi alterado', () => {
    render(<EdicaoAlunoPage />)
    expect(screen.queryByText(/próximas reservas/i)).not.toBeInTheDocument()
  })

  it('banner de aviso aparece ao alterar o ponto', () => {
    render(<EdicaoAlunoPage />)
    const pontoInput = screen.getByDisplayValue('Ponto Central')
    fireEvent.change(pontoInput, { target: { value: 'Ponto Norte' } })
    expect(screen.getByText(/próximas reservas/i)).toBeInTheDocument()
  })

  it('banner de aviso desaparece ao restaurar o ponto original', () => {
    render(<EdicaoAlunoPage />)
    const pontoInput = screen.getByDisplayValue('Ponto Central')
    fireEvent.change(pontoInput, { target: { value: 'Ponto Norte' } })
    fireEvent.change(pontoInput, { target: { value: 'Ponto Central' } })
    expect(screen.queryByText(/próximas reservas/i)).not.toBeInTheDocument()
  })
})

// ── Salvar ────────────────────────────────────────────────────────────────────

describe('EdicaoAlunoPage — salvar', () => {
  it('clicar em Salvar chama salvar com apenas os campos alterados', async () => {
    render(<EdicaoAlunoPage />)

    const nomeInput = screen.getByDisplayValue('Alice Santos')
    fireEvent.change(nomeInput, { target: { value: 'Alice Oliveira' } })

    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() =>
      expect(mockSalvar).toHaveBeenCalledWith({ nome: 'Alice Oliveira' })
    )
  })

  it('clicar em Salvar sem alterações chama salvar com objeto vazio', async () => {
    render(<EdicaoAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() => expect(mockSalvar).toHaveBeenCalledWith({}))
  })

  it('navega para /admin/alunos/:id após salvar com sucesso', async () => {
    render(<EdicaoAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin/alunos/a1'))
  })

  it('botão Salvar fica desabilitado quando salvando=true', () => {
    mockUseEdicaoAluno.mockReturnValue(defaultState({ salvando: true }))
    render(<EdicaoAlunoPage />)
    expect(screen.getByRole('button', { name: /salvar/i })).toBeDisabled()
  })

  it('exibe mensagem de erro quando salvar falha', async () => {
    mockSalvar.mockRejectedValue(new Error('Falha ao salvar.'))
    render(<EdicaoAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() => expect(screen.getByText('Falha ao salvar.')).toBeInTheDocument())
  })

  it('não navega quando salvar falha', async () => {
    mockSalvar.mockRejectedValue(new Error('Falha ao salvar.'))
    render(<EdicaoAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() => expect(screen.getByText('Falha ao salvar.')).toBeInTheDocument())
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('clicar em Salvar com ponto alterado inclui pontoEmbarquePadrao no diff', async () => {
    render(<EdicaoAlunoPage />)
    const pontoInput = screen.getByDisplayValue('Ponto Central')
    fireEvent.change(pontoInput, { target: { value: 'Ponto Norte' } })

    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() =>
      expect(mockSalvar).toHaveBeenCalledWith({ pontoEmbarquePadrao: 'Ponto Norte' })
    )
  })

  it('clicar em Salvar com modalidade alterada inclui modalidade no diff', async () => {
    render(<EdicaoAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /^online$/i }))

    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() =>
      expect(mockSalvar).toHaveBeenCalledWith({ modalidade: ModalidadeAluno.Online })
    )
  })
})
