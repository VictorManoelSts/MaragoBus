import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DetalheAlunoPage } from '@/pages/motorista/DetalheAlunoPage'
import { StatusAluno, ModalidadeAluno } from '@/types/aluno'
import type { Aluno } from '@/types/aluno'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUseDetalheAluno = jest.fn()
jest.mock('@/hooks/useDetalheAluno', () => ({
  useDetalheAluno: (...args: unknown[]) => mockUseDetalheAluno(...args),
}))

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'aluno-1' }),
  useNavigate: () => mockNavigate,
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ALUNO_FIXTURE: Aluno = {
  id: 'aluno-1',
  nome: 'Luana Beatriz',
  cpf: '12345678901',
  telefone: '(82) 99999-1111',
  endereco: 'Rua A',
  foto: null,
  faculdade: 'UFAL',
  curso: 'Direito',
  modalidade: ModalidadeAluno.Presencial,
  semestre: 3,
  anoConclusao: 2026,
  pontoEmbarquePadrao: 'Ponto Central',
  status: StatusAluno.Ativo,
  dataSuspensao: null,
  dataReativacao: null,
  primeiroAcesso: false,
}

function mockSucesso(pontoEscolhido: string | null = 'Ponto Central') {
  mockUseDetalheAluno.mockReturnValue({
    aluno: ALUNO_FIXTURE,
    pontoEscolhido,
    carregando: false,
    erro: null,
  })
}

function mockCarregando() {
  mockUseDetalheAluno.mockReturnValue({
    aluno: null,
    pontoEscolhido: null,
    carregando: true,
    erro: null,
  })
}

function mockErro(msg = 'Aluno não encontrado.') {
  mockUseDetalheAluno.mockReturnValue({
    aluno: null,
    pontoEscolhido: null,
    carregando: false,
    erro: msg,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSucesso()
})

// ── Carregamento ───────────────────────────────────────────────────────────────

describe('DetalheAlunoPage — carregamento', () => {
  it('exibe spinner enquanto carrega', () => {
    mockCarregando()
    render(<DetalheAlunoPage />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('oculta spinner após carregamento', () => {
    mockSucesso()
    render(<DetalheAlunoPage />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

// ── Header ────────────────────────────────────────────────────────────────────

describe('DetalheAlunoPage — header azul', () => {
  it('exibe o nome do aluno no header', () => {
    mockSucesso()
    render(<DetalheAlunoPage />)
    expect(screen.getByText('Luana Beatriz')).toBeInTheDocument()
  })

  it('exibe as iniciais do aluno no avatar', () => {
    mockSucesso()
    render(<DetalheAlunoPage />)
    expect(screen.getByText('LB')).toBeInTheDocument()
  })

  it('exibe iniciais de nome com uma única palavra', () => {
    mockUseDetalheAluno.mockReturnValue({
      aluno: { ...ALUNO_FIXTURE, nome: 'Madonna' },
      pontoEscolhido: null,
      carregando: false,
      erro: null,
    })
    render(<DetalheAlunoPage />)
    expect(screen.getByText('MA')).toBeInTheDocument()
  })
})

// ── Informações ───────────────────────────────────────────────────────────────

describe('DetalheAlunoPage — informações do aluno', () => {
  it('exibe a faculdade', () => {
    mockSucesso()
    render(<DetalheAlunoPage />)
    expect(screen.getByText('UFAL')).toBeInTheDocument()
  })

  it('exibe o curso', () => {
    mockSucesso()
    render(<DetalheAlunoPage />)
    expect(screen.getByText('Direito')).toBeInTheDocument()
  })

  it('exibe o ponto de embarque do dia', () => {
    mockSucesso('Ponto Central')
    render(<DetalheAlunoPage />)
    expect(screen.getByText('Ponto Central')).toBeInTheDocument()
  })

  it('exibe "—" quando não há reserva hoje', () => {
    mockSucesso(null)
    render(<DetalheAlunoPage />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('exibe o telefone', () => {
    mockSucesso()
    render(<DetalheAlunoPage />)
    expect(screen.getByText('(82) 99999-1111')).toBeInTheDocument()
  })
})

// ── Navegação ─────────────────────────────────────────────────────────────────

describe('DetalheAlunoPage — navegação', () => {
  it('botão voltar navega para /motorista/alunos', async () => {
    mockSucesso()
    render(<DetalheAlunoPage />)
    await userEvent.click(screen.getByRole('button', { name: /voltar/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/motorista/alunos')
  })
})

// ── Erro ──────────────────────────────────────────────────────────────────────

describe('DetalheAlunoPage — erro', () => {
  it('exibe mensagem de erro quando hook retorna erro', () => {
    mockErro('Aluno não encontrado.')
    render(<DetalheAlunoPage />)
    expect(screen.getByText('Aluno não encontrado.')).toBeInTheDocument()
  })

  it('não exibe conteúdo quando há erro', () => {
    mockErro()
    render(<DetalheAlunoPage />)
    expect(screen.queryByText('Luana Beatriz')).not.toBeInTheDocument()
  })
})
