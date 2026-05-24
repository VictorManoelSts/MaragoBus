import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { FeriadosPage } from '@/pages/admin/FeriadosPage'
import { TipoFeriado } from '@/types/feriado'
import type { UseFeriadosReturn } from '@/hooks/useFeriados'
import type { Feriado } from '@/types/feriado'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAdicionar = jest.fn()
const mockRemover = jest.fn()
const mockUseFeriados = jest.fn()

jest.mock('@/hooks/useFeriados', () => ({
  useFeriados: (...args: unknown[]) => mockUseFeriados(...args),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeFeriado(id: string, data: string, tipo: TipoFeriado, nome?: string): Feriado {
  return { id, data, nome: nome ?? `Feriado ${id}`, tipo }
}

const FERIADOS_FIXTURE: Feriado[] = [
  makeFeriado('f1', '2026-01-01', TipoFeriado.Nacional, 'Confraternização Universal'),
  makeFeriado('f2', '2026-06-24', TipoFeriado.Regional, 'São João'),
  makeFeriado('f3', '2026-09-07', TipoFeriado.Avulso, 'Ponto Facultativo'),
]

function defaultState(overrides: Partial<UseFeriadosReturn> = {}): UseFeriadosReturn {
  return {
    feriados: FERIADOS_FIXTURE,
    carregando: false,
    erro: null,
    adicionar: mockAdicionar,
    remover: mockRemover,
    avisos: [],
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseFeriados.mockReturnValue(defaultState())
  mockAdicionar.mockResolvedValue(undefined)
  mockRemover.mockResolvedValue(undefined)
})

// ── Renderização ──────────────────────────────────────────────────────────────

describe('FeriadosPage — renderização', () => {
  it('exibe título "Feriados"', () => {
    render(<FeriadosPage />)
    expect(screen.getByText('Feriados')).toBeInTheDocument()
  })

  it('exibe os nomes dos feriados', () => {
    render(<FeriadosPage />)
    expect(screen.getByText('Confraternização Universal')).toBeInTheDocument()
    expect(screen.getByText('São João')).toBeInTheDocument()
    expect(screen.getByText('Ponto Facultativo')).toBeInTheDocument()
  })

  it('exibe datas formatadas como DD/MM/AAAA', () => {
    render(<FeriadosPage />)
    expect(screen.getByText('01/01/2026')).toBeInTheDocument()
    expect(screen.getByText('24/06/2026')).toBeInTheDocument()
    expect(screen.getByText('07/09/2026')).toBeInTheDocument()
  })

  it('exibe botão Remover para cada feriado', () => {
    render(<FeriadosPage />)
    expect(screen.getAllByRole('button', { name: /remover/i })).toHaveLength(3)
  })

  it('exibe o calendário', () => {
    render(<FeriadosPage />)
    expect(screen.getByTestId('calendario')).toBeInTheDocument()
  })

  it('exibe os chips de filtro', () => {
    render(<FeriadosPage />)
    const filtros = screen.getByTestId('filtros')
    expect(within(filtros).getByRole('button', { name: /^todos$/i })).toBeInTheDocument()
    expect(within(filtros).getByRole('button', { name: /^nacional$/i })).toBeInTheDocument()
    expect(within(filtros).getByRole('button', { name: /^regional$/i })).toBeInTheDocument()
    expect(within(filtros).getByRole('button', { name: /^avulso$/i })).toBeInTheDocument()
  })
})

// ── Carregamento ──────────────────────────────────────────────────────────────

describe('FeriadosPage — carregamento', () => {
  it('exibe spinner quando carregando=true', () => {
    mockUseFeriados.mockReturnValue(defaultState({ carregando: true }))
    render(<FeriadosPage />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('não exibe feriados quando carregando=true', () => {
    mockUseFeriados.mockReturnValue(defaultState({ carregando: true }))
    render(<FeriadosPage />)
    expect(screen.queryByText('Confraternização Universal')).not.toBeInTheDocument()
  })

  it('não exibe o formulário quando carregando=true', () => {
    mockUseFeriados.mockReturnValue(defaultState({ carregando: true }))
    render(<FeriadosPage />)
    expect(screen.queryByLabelText(/nome do feriado/i)).not.toBeInTheDocument()
  })
})

// ── Empty state ───────────────────────────────────────────────────────────────

describe('FeriadosPage — empty state', () => {
  it('exibe mensagem quando não há feriados', () => {
    mockUseFeriados.mockReturnValue(defaultState({ feriados: [] }))
    render(<FeriadosPage />)
    expect(screen.getByText(/nenhum feriado cadastrado/i)).toBeInTheDocument()
  })

  it('não exibe empty state quando há feriados', () => {
    render(<FeriadosPage />)
    expect(screen.queryByText(/nenhum feriado cadastrado/i)).not.toBeInTheDocument()
  })
})

// ── Filtros ───────────────────────────────────────────────────────────────────

describe('FeriadosPage — filtros', () => {
  it('exibe todos os feriados com chip "Todos" ativo por padrão', () => {
    render(<FeriadosPage />)
    expect(screen.getByText('Confraternização Universal')).toBeInTheDocument()
    expect(screen.getByText('São João')).toBeInTheDocument()
    expect(screen.getByText('Ponto Facultativo')).toBeInTheDocument()
  })

  it('filtra por Nacional ao clicar no chip', () => {
    render(<FeriadosPage />)
    fireEvent.click(within(screen.getByTestId('filtros')).getByRole('button', { name: /^nacional$/i }))
    expect(screen.getByText('Confraternização Universal')).toBeInTheDocument()
    expect(screen.queryByText('São João')).not.toBeInTheDocument()
    expect(screen.queryByText('Ponto Facultativo')).not.toBeInTheDocument()
  })

  it('filtra por Regional ao clicar no chip', () => {
    render(<FeriadosPage />)
    fireEvent.click(within(screen.getByTestId('filtros')).getByRole('button', { name: /^regional$/i }))
    expect(screen.getByText('São João')).toBeInTheDocument()
    expect(screen.queryByText('Confraternização Universal')).not.toBeInTheDocument()
    expect(screen.queryByText('Ponto Facultativo')).not.toBeInTheDocument()
  })

  it('filtra por Avulso ao clicar no chip', () => {
    render(<FeriadosPage />)
    fireEvent.click(within(screen.getByTestId('filtros')).getByRole('button', { name: /^avulso$/i }))
    expect(screen.getByText('Ponto Facultativo')).toBeInTheDocument()
    expect(screen.queryByText('Confraternização Universal')).not.toBeInTheDocument()
    expect(screen.queryByText('São João')).not.toBeInTheDocument()
  })

  it('volta a exibir todos ao clicar em Todos novamente', () => {
    render(<FeriadosPage />)
    const filtros = screen.getByTestId('filtros')
    fireEvent.click(within(filtros).getByRole('button', { name: /^nacional$/i }))
    fireEvent.click(within(filtros).getByRole('button', { name: /^todos$/i }))
    expect(screen.getByText('Confraternização Universal')).toBeInTheDocument()
    expect(screen.getByText('São João')).toBeInTheDocument()
  })
})

// ── Formulário ────────────────────────────────────────────────────────────────

describe('FeriadosPage — formulário', () => {
  it('exibe campo de data', () => {
    render(<FeriadosPage />)
    expect(screen.getByLabelText(/^data$/i)).toBeInTheDocument()
  })

  it('exibe campo de nome do feriado', () => {
    render(<FeriadosPage />)
    expect(screen.getByLabelText(/nome do feriado/i)).toBeInTheDocument()
  })

  it('exibe chips de tipo Regional e Avulso no formulário', () => {
    render(<FeriadosPage />)
    const formTipo = screen.getByTestId('form-tipo')
    expect(within(formTipo).getByRole('button', { name: /^regional$/i })).toBeInTheDocument()
    expect(within(formTipo).getByRole('button', { name: /^avulso$/i })).toBeInTheDocument()
  })

  it('exibe botão Adicionar', () => {
    render(<FeriadosPage />)
    expect(screen.getByRole('button', { name: /^adicionar$/i })).toBeInTheDocument()
  })

  it('exibe erro quando data está vazia ao tentar adicionar', async () => {
    render(<FeriadosPage />)
    fireEvent.click(screen.getByRole('button', { name: /^adicionar$/i }))
    await waitFor(() =>
      expect(screen.getByText(/data é obrigatória/i)).toBeInTheDocument()
    )
  })

  it('exibe erro quando nome está vazio ao tentar adicionar', async () => {
    render(<FeriadosPage />)
    fireEvent.change(screen.getByLabelText(/^data$/i), { target: { value: '2026-07-04' } })
    fireEvent.click(screen.getByRole('button', { name: /^adicionar$/i }))
    await waitFor(() =>
      expect(screen.getByText(/nome é obrigatório/i)).toBeInTheDocument()
    )
  })

  it('chama adicionar com data, nome e tipo Regional por padrão', async () => {
    render(<FeriadosPage />)
    fireEvent.change(screen.getByLabelText(/^data$/i), { target: { value: '2026-06-24' } })
    fireEvent.change(screen.getByLabelText(/nome do feriado/i), { target: { value: 'São João' } })
    fireEvent.click(screen.getByRole('button', { name: /^adicionar$/i }))
    await waitFor(() =>
      expect(mockAdicionar).toHaveBeenCalledWith('2026-06-24', 'São João', TipoFeriado.Regional)
    )
  })

  it('chama adicionar com tipo Avulso ao selecionar chip Avulso no formulário', async () => {
    render(<FeriadosPage />)
    fireEvent.click(within(screen.getByTestId('form-tipo')).getByRole('button', { name: /^avulso$/i }))
    fireEvent.change(screen.getByLabelText(/^data$/i), { target: { value: '2026-07-04' } })
    fireEvent.change(screen.getByLabelText(/nome do feriado/i), { target: { value: 'Dia X' } })
    fireEvent.click(screen.getByRole('button', { name: /^adicionar$/i }))
    await waitFor(() =>
      expect(mockAdicionar).toHaveBeenCalledWith('2026-07-04', 'Dia X', TipoFeriado.Avulso)
    )
  })

  it('limpa o formulário após adicionar com sucesso', async () => {
    render(<FeriadosPage />)
    fireEvent.change(screen.getByLabelText(/^data$/i), { target: { value: '2026-06-24' } })
    fireEvent.change(screen.getByLabelText(/nome do feriado/i), { target: { value: 'São João' } })
    fireEvent.click(screen.getByRole('button', { name: /^adicionar$/i }))
    await waitFor(() =>
      expect((screen.getByLabelText<HTMLInputElement>(/^data$/i)).value).toBe('')
    )
    expect((screen.getByLabelText<HTMLInputElement>(/nome do feriado/i)).value).toBe('')
  })

  it('exibe erro de rede quando adicionar falha', async () => {
    mockAdicionar.mockRejectedValue(new Error('Falha ao salvar'))
    render(<FeriadosPage />)
    fireEvent.change(screen.getByLabelText(/^data$/i), { target: { value: '2026-06-24' } })
    fireEvent.change(screen.getByLabelText(/nome do feriado/i), { target: { value: 'São João' } })
    fireEvent.click(screen.getByRole('button', { name: /^adicionar$/i }))
    await waitFor(() =>
      expect(screen.getByText(/falha ao salvar/i)).toBeInTheDocument()
    )
  })

  it('desabilita botão Adicionar durante processamento', async () => {
    let resolver!: () => void
    mockAdicionar.mockReturnValue(new Promise<void>(r => { resolver = r }))
    render(<FeriadosPage />)
    fireEvent.change(screen.getByLabelText(/^data$/i), { target: { value: '2026-06-24' } })
    fireEvent.change(screen.getByLabelText(/nome do feriado/i), { target: { value: 'São João' } })
    fireEvent.click(screen.getByRole('button', { name: /^adicionar$/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^adicionar$/i })).toBeDisabled()
    )
    resolver()
  })
})

// ── Remoção ───────────────────────────────────────────────────────────────────

describe('FeriadosPage — remoção', () => {
  it('chama remover com o ID do primeiro feriado ao clicar em Remover', async () => {
    render(<FeriadosPage />)
    const botoes = screen.getAllByRole('button', { name: /remover/i })
    fireEvent.click(botoes[0])
    await waitFor(() => expect(mockRemover).toHaveBeenCalledWith('f1'))
  })

  it('chama remover com o ID correto para cada feriado', async () => {
    render(<FeriadosPage />)
    const botoes = screen.getAllByRole('button', { name: /remover/i })
    fireEvent.click(botoes[1])
    await waitFor(() => expect(mockRemover).toHaveBeenCalledWith('f2'))
  })
})

// ── Modal de aviso ────────────────────────────────────────────────────────────

describe('FeriadosPage — modal de aviso', () => {
  it('não exibe modal quando não há avisos', () => {
    render(<FeriadosPage />)
    expect(screen.queryByTestId('modal-aviso-feriado')).not.toBeInTheDocument()
  })

  it('exibe modal automaticamente quando há avisos', () => {
    const aviso = makeFeriado('f-aviso', '2026-05-27', TipoFeriado.Nacional, 'Corpus Christi')
    mockUseFeriados.mockReturnValue(defaultState({ avisos: [aviso] }))
    render(<FeriadosPage />)
    expect(screen.getByTestId('modal-aviso-feriado')).toBeInTheDocument()
  })

  it('exibe nome do feriado no modal', () => {
    const aviso = makeFeriado('f-aviso', '2026-05-27', TipoFeriado.Nacional, 'Corpus Christi')
    mockUseFeriados.mockReturnValue(defaultState({ avisos: [aviso] }))
    render(<FeriadosPage />)
    expect(screen.getByTestId('modal-aviso-feriado')).toHaveTextContent('Corpus Christi')
  })

  it('exibe data formatada no modal', () => {
    const aviso = makeFeriado('f-aviso', '2026-05-27', TipoFeriado.Nacional, 'Corpus Christi')
    mockUseFeriados.mockReturnValue(defaultState({ avisos: [aviso] }))
    render(<FeriadosPage />)
    expect(screen.getByTestId('modal-aviso-feriado')).toHaveTextContent('27/05/2026')
  })

  it('exibe múltiplos avisos no modal', () => {
    const avisos = [
      makeFeriado('fa1', '2026-05-25', TipoFeriado.Nacional, 'Feriado A'),
      makeFeriado('fa2', '2026-05-27', TipoFeriado.Regional, 'Feriado B'),
    ]
    mockUseFeriados.mockReturnValue(defaultState({ avisos }))
    render(<FeriadosPage />)
    const modal = screen.getByTestId('modal-aviso-feriado')
    expect(within(modal).getByText('Feriado A')).toBeInTheDocument()
    expect(within(modal).getByText('Feriado B')).toBeInTheDocument()
  })

  it('fecha o modal ao clicar em Entendido', () => {
    const aviso = makeFeriado('f-aviso', '2026-05-27', TipoFeriado.Nacional, 'Corpus Christi')
    mockUseFeriados.mockReturnValue(defaultState({ avisos: [aviso] }))
    render(<FeriadosPage />)
    fireEvent.click(screen.getByRole('button', { name: /entendido/i }))
    expect(screen.queryByTestId('modal-aviso-feriado')).not.toBeInTheDocument()
  })
})

// ── Calendário ────────────────────────────────────────────────────────────────

describe('FeriadosPage — calendário', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-05-24T10:00:00'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('exibe botões de navegação de mês', () => {
    render(<FeriadosPage />)
    expect(screen.getByTestId('btn-mes-anterior')).toBeInTheDocument()
    expect(screen.getByTestId('btn-proximo-mes')).toBeInTheDocument()
  })

  it('exibe o mês e ano corretos no cabeçalho', () => {
    render(<FeriadosPage />)
    expect(screen.getByTestId('calendario-mes-header')).toHaveTextContent('Maio 2026')
  })

  it('avança para o próximo mês ao clicar no botão', () => {
    render(<FeriadosPage />)
    fireEvent.click(screen.getByTestId('btn-proximo-mes'))
    expect(screen.getByTestId('calendario-mes-header')).toHaveTextContent('Junho 2026')
  })

  it('volta para o mês anterior ao clicar no botão', () => {
    render(<FeriadosPage />)
    fireEvent.click(screen.getByTestId('btn-mes-anterior'))
    expect(screen.getByTestId('calendario-mes-header')).toHaveTextContent('Abril 2026')
  })

  it('destaca dias com feriados no mês exibido', () => {
    const feriadoMaio = makeFeriado('f-maio', '2026-05-20', TipoFeriado.Nacional, 'Ascensão')
    mockUseFeriados.mockReturnValue(defaultState({ feriados: [feriadoMaio] }))
    render(<FeriadosPage />)
    expect(screen.getByTestId('dia-feriado-2026-05-20')).toBeInTheDocument()
  })

  it('não destaca dias sem feriado', () => {
    render(<FeriadosPage />)
    expect(screen.queryByTestId('dia-feriado-2026-05-15')).not.toBeInTheDocument()
  })
})
