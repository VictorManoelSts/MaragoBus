import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { DetalheAlunoPage } from '@/pages/admin/DetalheAlunoPage'
import { StatusAluno, ModalidadeAluno } from '@/types/aluno'
import { TipoAdvertencia } from '@/types/advertencia'
import type { Aluno } from '@/types/aluno'
import type { Advertencia } from '@/types/advertencia'
import type { UseAdminDetalheAlunoReturn } from '@/hooks/useAdminDetalheAluno'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAplicarAdvertencia = jest.fn()
const mockSuspenderAluno = jest.fn()
const mockReativarAluno = jest.fn()
const mockExcluirAluno = jest.fn()
const mockUseAdminDetalheAluno = jest.fn()

jest.mock('@/hooks/useAdminDetalheAluno', () => ({
  useAdminDetalheAluno: (...args: unknown[]) => mockUseAdminDetalheAluno(...args),
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

function makeAdvertencia(overrides: Partial<Advertencia> = {}): Advertencia {
  return {
    id: 'adv-1',
    alunoId: 'a1',
    motivo: 'Falta injustificada',
    aplicadaPor: 'admin-uid',
    tipo: TipoAdvertencia.Direta,
    data: { toDate: () => new Date('2026-04-01') } as unknown as import('firebase/firestore').Timestamp,
    ...overrides,
  }
}

const ALUNO_ATIVO = makeAluno()
const ALUNO_SUSPENSO = makeAluno({
  status: StatusAluno.Suspenso,
  dataSuspensao: '2026-05-20',
  dataReativacao: '2026-05-25',
})

const ADV_1 = makeAdvertencia({ id: 'adv-1', motivo: 'Falta injustificada' })
const ADV_2 = makeAdvertencia({ id: 'adv-2', motivo: 'Atraso recorrente' })

function defaultState(overrides: Partial<UseAdminDetalheAlunoReturn> = {}): UseAdminDetalheAlunoReturn {
  return {
    aluno: ALUNO_ATIVO,
    advertencias: [ADV_1],
    carregando: false,
    erro: null,
    aplicarAdvertencia: mockAplicarAdvertencia,
    suspenderAluno: mockSuspenderAluno,
    reativarAluno: mockReativarAluno,
    excluirAluno: mockExcluirAluno,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseAdminDetalheAluno.mockReturnValue(defaultState())
  mockAplicarAdvertencia.mockResolvedValue(undefined)
  mockSuspenderAluno.mockResolvedValue(undefined)
  mockReativarAluno.mockResolvedValue(undefined)
  mockExcluirAluno.mockResolvedValue(undefined)
})

// ── Spinner e erro ────────────────────────────────────────────────────────────

describe('DetalheAlunoPage — estados de carregamento', () => {
  it('exibe spinner quando carregando=true', () => {
    mockUseAdminDetalheAluno.mockReturnValue(defaultState({ carregando: true, aluno: null }))
    render(<DetalheAlunoPage />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('não exibe conteúdo quando carregando=true', () => {
    mockUseAdminDetalheAluno.mockReturnValue(defaultState({ carregando: true, aluno: null }))
    render(<DetalheAlunoPage />)
    expect(screen.queryByText('Alice Santos')).not.toBeInTheDocument()
  })

  it('exibe mensagem de erro quando erro está definido', () => {
    mockUseAdminDetalheAluno.mockReturnValue(
      defaultState({ erro: 'Aluno não encontrado.', aluno: null })
    )
    render(<DetalheAlunoPage />)
    expect(screen.getByText('Aluno não encontrado.')).toBeInTheDocument()
  })
})

// ── Botão voltar ──────────────────────────────────────────────────────────────

describe('DetalheAlunoPage — navegação', () => {
  it('exibe botão Voltar', () => {
    render(<DetalheAlunoPage />)
    expect(screen.getByRole('button', { name: /voltar/i })).toBeInTheDocument()
  })

  it('clicar em Voltar navega para /admin/alunos', () => {
    render(<DetalheAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/admin/alunos')
  })
})

// ── Header azul ───────────────────────────────────────────────────────────────

describe('DetalheAlunoPage — header azul', () => {
  it('exibe as iniciais do aluno no avatar', () => {
    render(<DetalheAlunoPage />)
    const header = screen.getByTestId('header-aluno')
    expect(within(header).getByText('AS')).toBeInTheDocument()
  })

  it('exibe o nome completo do aluno', () => {
    render(<DetalheAlunoPage />)
    const header = screen.getByTestId('header-aluno')
    expect(within(header).getByText('Alice Santos')).toBeInTheDocument()
  })

  it('exibe faculdade e curso no header', () => {
    render(<DetalheAlunoPage />)
    const header = screen.getByTestId('header-aluno')
    expect(within(header).getByText(/UFAL/)).toBeInTheDocument()
    expect(within(header).getByText(/Direito/)).toBeInTheDocument()
  })

  it('exibe badge "Ativo" no header quando status é Ativo', () => {
    render(<DetalheAlunoPage />)
    const header = screen.getByTestId('header-aluno')
    expect(within(header).getByText('Ativo')).toBeInTheDocument()
  })

  it('exibe badge "Suspenso" no header quando status é Suspenso', () => {
    mockUseAdminDetalheAluno.mockReturnValue(defaultState({ aluno: ALUNO_SUSPENSO }))
    render(<DetalheAlunoPage />)
    const header = screen.getByTestId('header-aluno')
    expect(within(header).getByText('Suspenso')).toBeInTheDocument()
  })
})

// ── Dados pessoais ────────────────────────────────────────────────────────────

describe('DetalheAlunoPage — dados pessoais', () => {
  it('exibe o CPF do aluno', () => {
    render(<DetalheAlunoPage />)
    const secao = screen.getByTestId('secao-dados-pessoais')
    expect(within(secao).getByText('123.456.789-01')).toBeInTheDocument()
  })

  it('exibe o telefone do aluno', () => {
    render(<DetalheAlunoPage />)
    const secao = screen.getByTestId('secao-dados-pessoais')
    expect(within(secao).getByText('(82) 99999-0000')).toBeInTheDocument()
  })

  it('exibe o endereço do aluno', () => {
    render(<DetalheAlunoPage />)
    const secao = screen.getByTestId('secao-dados-pessoais')
    expect(within(secao).getByText('Rua das Flores, 100')).toBeInTheDocument()
  })
})

// ── Dados acadêmicos ──────────────────────────────────────────────────────────

describe('DetalheAlunoPage — dados acadêmicos', () => {
  it('exibe o curso do aluno', () => {
    render(<DetalheAlunoPage />)
    const secao = screen.getByTestId('secao-dados-academicos')
    expect(within(secao).getByText('Direito')).toBeInTheDocument()
  })

  it('exibe a modalidade do aluno', () => {
    render(<DetalheAlunoPage />)
    const secao = screen.getByTestId('secao-dados-academicos')
    expect(within(secao).getByText('Presencial')).toBeInTheDocument()
  })

  it('exibe o semestre do aluno', () => {
    render(<DetalheAlunoPage />)
    const secao = screen.getByTestId('secao-dados-academicos')
    expect(within(secao).getByText(/3/)).toBeInTheDocument()
  })

  it('exibe o ano de conclusão', () => {
    render(<DetalheAlunoPage />)
    const secao = screen.getByTestId('secao-dados-academicos')
    expect(within(secao).getByText('2027')).toBeInTheDocument()
  })

  it('exibe o ponto de embarque padrão', () => {
    render(<DetalheAlunoPage />)
    const secao = screen.getByTestId('secao-dados-academicos')
    expect(within(secao).getByText('Ponto Central')).toBeInTheDocument()
  })
})

// ── Histórico de advertências ─────────────────────────────────────────────────

describe('DetalheAlunoPage — histórico de advertências', () => {
  it('exibe o motivo de cada advertência', () => {
    render(<DetalheAlunoPage />)
    expect(screen.getByText('Falta injustificada')).toBeInTheDocument()
  })

  it('exibe múltiplas advertências', () => {
    mockUseAdminDetalheAluno.mockReturnValue(defaultState({ advertencias: [ADV_1, ADV_2] }))
    render(<DetalheAlunoPage />)
    expect(screen.getByText('Falta injustificada')).toBeInTheDocument()
    expect(screen.getByText('Atraso recorrente')).toBeInTheDocument()
  })

  it('exibe mensagem de "sem advertências" quando lista está vazia', () => {
    mockUseAdminDetalheAluno.mockReturnValue(defaultState({ advertencias: [] }))
    render(<DetalheAlunoPage />)
    expect(screen.getByText(/sem advertências/i)).toBeInTheDocument()
  })
})

// ── Botão Aplicar advertência ─────────────────────────────────────────────────

describe('DetalheAlunoPage — aplicar advertência', () => {
  it('exibe botão de aplicar advertência', () => {
    render(<DetalheAlunoPage />)
    expect(screen.getByRole('button', { name: /aplicar advertência/i })).toBeInTheDocument()
  })

  it('clicar em Aplicar advertência abre modal com textarea', () => {
    render(<DetalheAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /aplicar advertência/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/justificativa/i)).toBeInTheDocument()
  })

  it('confirmar modal chama aplicarAdvertencia com o motivo digitado', async () => {
    render(<DetalheAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /aplicar advertência/i }))

    fireEvent.change(screen.getByPlaceholderText(/justificativa/i), {
      target: { value: 'Conduta inadequada' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^aplicar$/i }))

    await waitFor(() =>
      expect(mockAplicarAdvertencia).toHaveBeenCalledWith('Conduta inadequada')
    )
  })

  it('cancelar modal fecha sem chamar aplicarAdvertencia', () => {
    render(<DetalheAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /aplicar advertência/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mockAplicarAdvertencia).not.toHaveBeenCalled()
  })

  it('botão Aplicar no modal fica desabilitado sem motivo', () => {
    render(<DetalheAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /aplicar advertência/i }))
    expect(screen.getByRole('button', { name: /^aplicar$/i })).toBeDisabled()
  })
})

// ── Botão Suspender ───────────────────────────────────────────────────────────

describe('DetalheAlunoPage — suspender aluno', () => {
  it('exibe botão Suspender quando aluno não está suspenso', () => {
    render(<DetalheAlunoPage />)
    expect(screen.getByRole('button', { name: /suspender/i })).toBeInTheDocument()
  })

  it('não exibe botão Suspender quando aluno já está suspenso', () => {
    mockUseAdminDetalheAluno.mockReturnValue(defaultState({ aluno: ALUNO_SUSPENSO }))
    render(<DetalheAlunoPage />)
    expect(screen.queryByRole('button', { name: /^suspender/i })).not.toBeInTheDocument()
  })

  it('clicar em Suspender abre modal de confirmação', () => {
    render(<DetalheAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /suspender/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/3 dias úteis/i)).toBeInTheDocument()
  })

  it('confirmar suspensão chama suspenderAluno', async () => {
    render(<DetalheAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /suspender/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => expect(mockSuspenderAluno).toHaveBeenCalledTimes(1))
  })

  it('cancelar suspensão não chama suspenderAluno', () => {
    render(<DetalheAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /suspender/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))

    expect(mockSuspenderAluno).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

// ── Botão Reativar ────────────────────────────────────────────────────────────

describe('DetalheAlunoPage — reativar aluno', () => {
  it('não exibe botão Reativar quando aluno está ativo', () => {
    render(<DetalheAlunoPage />)
    expect(screen.queryByRole('button', { name: /reativar/i })).not.toBeInTheDocument()
  })

  it('exibe botão Reativar quando aluno está suspenso', () => {
    mockUseAdminDetalheAluno.mockReturnValue(defaultState({ aluno: ALUNO_SUSPENSO }))
    render(<DetalheAlunoPage />)
    expect(screen.getByRole('button', { name: /reativar/i })).toBeInTheDocument()
  })

  it('clicar em Reativar chama reativarAluno', async () => {
    mockUseAdminDetalheAluno.mockReturnValue(defaultState({ aluno: ALUNO_SUSPENSO }))
    render(<DetalheAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /reativar/i }))

    await waitFor(() => expect(mockReativarAluno).toHaveBeenCalledTimes(1))
  })
})

// ── Botão Excluir ─────────────────────────────────────────────────────────────

describe('DetalheAlunoPage — excluir aluno', () => {
  it('exibe botão Excluir', () => {
    render(<DetalheAlunoPage />)
    expect(screen.getByRole('button', { name: /excluir/i })).toBeInTheDocument()
  })

  it('clicar em Excluir abre modal de confirmação', () => {
    render(<DetalheAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /excluir/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/permanentemente/i)).toBeInTheDocument()
  })

  it('confirmar exclusão chama excluirAluno', async () => {
    render(<DetalheAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /excluir/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => expect(mockExcluirAluno).toHaveBeenCalledTimes(1))
  })

  it('confirmar exclusão navega para /admin/alunos', async () => {
    render(<DetalheAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /excluir/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin/alunos'))
  })

  it('cancelar exclusão não chama excluirAluno', () => {
    render(<DetalheAlunoPage />)
    fireEvent.click(screen.getByRole('button', { name: /excluir/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))

    expect(mockExcluirAluno).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
