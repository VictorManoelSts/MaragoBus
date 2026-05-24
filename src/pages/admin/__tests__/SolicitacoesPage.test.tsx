import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SolicitacoesPage } from '@/pages/admin/SolicitacoesPage'
import type { UseSolicitacoesReturn } from '@/hooks/useSolicitacoes'
import type { SolicitacaoComDetalhes } from '@/services/adminService'
import type { Timestamp } from 'firebase/firestore'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockConfirmar = jest.fn()
const mockRejeitar = jest.fn()
const mockUseSolicitacoes = jest.fn()

jest.mock('@/hooks/useSolicitacoes', () => ({
  useSolicitacoes: (...args: unknown[]) => mockUseSolicitacoes(...args),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TIMESTAMP_FIXTURE = { toDate: () => new Date('2026-05-20T10:00:00') } as unknown as Timestamp

function makeSolicitacao(overrides: Partial<SolicitacaoComDetalhes> = {}): SolicitacaoComDetalhes {
  return {
    id: 's1',
    alunoId: 'a1',
    motoristaId: 'm1',
    nomeAluno: 'Alice Santos',
    nomeMotorista: 'Carlos Silva',
    motivo: 'Faltou ao embarque',
    data: TIMESTAMP_FIXTURE,
    ...overrides,
  }
}

function defaultState(overrides: Partial<UseSolicitacoesReturn> = {}): UseSolicitacoesReturn {
  return {
    solicitacoes: [makeSolicitacao()],
    carregando: false,
    confirmar: mockConfirmar,
    rejeitar: mockRejeitar,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseSolicitacoes.mockReturnValue(defaultState())
  mockConfirmar.mockResolvedValue(undefined)
  mockRejeitar.mockResolvedValue(undefined)
})

// ── Renderização ──────────────────────────────────────────────────────────────

describe('SolicitacoesPage — renderização', () => {
  it('exibe título "Solicitações"', () => {
    render(<SolicitacoesPage />)
    expect(screen.getByText('Solicitações')).toBeInTheDocument()
  })

  it('exibe badge com contador de pendências', () => {
    mockUseSolicitacoes.mockReturnValue(defaultState({
      solicitacoes: [makeSolicitacao(), makeSolicitacao({ id: 's2' })],
    }))
    render(<SolicitacoesPage />)
    expect(screen.getByTestId('badge-pendencias')).toHaveTextContent('2')
  })

  it('não exibe badge quando não há pendências', () => {
    mockUseSolicitacoes.mockReturnValue(defaultState({ solicitacoes: [] }))
    render(<SolicitacoesPage />)
    expect(screen.queryByTestId('badge-pendencias')).not.toBeInTheDocument()
  })

  it('exibe nome do aluno', () => {
    render(<SolicitacoesPage />)
    expect(screen.getByText('Alice Santos')).toBeInTheDocument()
  })

  it('exibe nome do motorista', () => {
    render(<SolicitacoesPage />)
    expect(screen.getByText(/Carlos Silva/)).toBeInTheDocument()
  })

  it('exibe motivo da solicitação', () => {
    render(<SolicitacoesPage />)
    expect(screen.getByText('Faltou ao embarque')).toBeInTheDocument()
  })

  it('exibe data da solicitação formatada como DD/MM/AAAA', () => {
    render(<SolicitacoesPage />)
    expect(screen.getByText('20/05/2026')).toBeInTheDocument()
  })

  it('exibe avatar com iniciais do aluno', () => {
    render(<SolicitacoesPage />)
    expect(screen.getByText('AS')).toBeInTheDocument()
  })

  it('exibe botão Confirmar', () => {
    render(<SolicitacoesPage />)
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument()
  })

  it('exibe botão Rejeitar', () => {
    render(<SolicitacoesPage />)
    expect(screen.getByRole('button', { name: /rejeitar/i })).toBeInTheDocument()
  })
})

// ── Carregamento ──────────────────────────────────────────────────────────────

describe('SolicitacoesPage — carregamento', () => {
  it('exibe spinner quando carregando=true', () => {
    mockUseSolicitacoes.mockReturnValue(defaultState({ carregando: true }))
    render(<SolicitacoesPage />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('não exibe cards quando carregando=true', () => {
    mockUseSolicitacoes.mockReturnValue(defaultState({ carregando: true }))
    render(<SolicitacoesPage />)
    expect(screen.queryByText('Alice Santos')).not.toBeInTheDocument()
  })
})

// ── Empty state ───────────────────────────────────────────────────────────────

describe('SolicitacoesPage — empty state', () => {
  it('exibe mensagem quando não há solicitações pendentes', () => {
    mockUseSolicitacoes.mockReturnValue(defaultState({ solicitacoes: [] }))
    render(<SolicitacoesPage />)
    expect(screen.getByText(/nenhuma solicitação pendente/i)).toBeInTheDocument()
  })

  it('não exibe empty state quando há solicitações', () => {
    render(<SolicitacoesPage />)
    expect(screen.queryByText(/nenhuma solicitação pendente/i)).not.toBeInTheDocument()
  })
})

// ── Fluxo — confirmar ─────────────────────────────────────────────────────────

describe('SolicitacoesPage — confirmar', () => {
  it('exibe campo de justificativa ao clicar em Confirmar', () => {
    render(<SolicitacoesPage />)
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    expect(screen.getByLabelText(/justificativa/i)).toBeInTheDocument()
  })

  it('exibe erro se tentar confirmar com justificativa vazia', async () => {
    render(<SolicitacoesPage />)
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    await waitFor(() =>
      expect(screen.getByText(/justificativa é obrigatória/i)).toBeInTheDocument()
    )
  })

  it('chama confirmar com id, alunoId, motivo e justificativa', async () => {
    render(<SolicitacoesPage />)
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    fireEvent.change(screen.getByLabelText(/justificativa/i), {
      target: { value: 'Falta confirmada pelo admin' },
    })
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() =>
      expect(mockConfirmar).toHaveBeenCalledWith(
        's1', 'a1', 'Faltou ao embarque', 'Falta confirmada pelo admin'
      )
    )
  })

  it('fecha o formulário após confirmar com sucesso', async () => {
    render(<SolicitacoesPage />)
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    fireEvent.change(screen.getByLabelText(/justificativa/i), { target: { value: 'Admin ok' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() =>
      expect(screen.queryByLabelText(/justificativa/i)).not.toBeInTheDocument()
    )
  })

  it('exibe mensagem de erro quando confirmar falha', async () => {
    mockConfirmar.mockRejectedValue(new Error('Falha no servidor'))
    render(<SolicitacoesPage />)
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    fireEvent.change(screen.getByLabelText(/justificativa/i), { target: { value: 'Admin ok' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() =>
      expect(screen.getByText(/falha no servidor/i)).toBeInTheDocument()
    )
  })

  it('desabilita botão confirmar durante processamento', async () => {
    let resolver!: () => void
    mockConfirmar.mockReturnValue(new Promise<void>((r) => { resolver = r }))
    render(<SolicitacoesPage />)
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    fireEvent.change(screen.getByLabelText(/justificativa/i), { target: { value: 'Admin ok' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /confirmar/i })).toBeDisabled()
    )
    resolver()
  })
})

// ── Fluxo — rejeitar ──────────────────────────────────────────────────────────

describe('SolicitacoesPage — rejeitar', () => {
  it('exibe campo de justificativa ao clicar em Rejeitar', () => {
    render(<SolicitacoesPage />)
    fireEvent.click(screen.getByRole('button', { name: /rejeitar/i }))
    expect(screen.getByLabelText(/justificativa/i)).toBeInTheDocument()
  })

  it('exibe erro se tentar rejeitar com justificativa vazia', async () => {
    render(<SolicitacoesPage />)
    fireEvent.click(screen.getByRole('button', { name: /rejeitar/i }))
    fireEvent.click(screen.getByRole('button', { name: /rejeitar/i }))
    await waitFor(() =>
      expect(screen.getByText(/justificativa é obrigatória/i)).toBeInTheDocument()
    )
  })

  it('chama rejeitar com id e justificativa', async () => {
    render(<SolicitacoesPage />)
    fireEvent.click(screen.getByRole('button', { name: /rejeitar/i }))
    fireEvent.change(screen.getByLabelText(/justificativa/i), {
      target: { value: 'Motivo insuficiente' },
    })
    fireEvent.click(screen.getByRole('button', { name: /rejeitar/i }))

    await waitFor(() =>
      expect(mockRejeitar).toHaveBeenCalledWith('s1', 'Motivo insuficiente')
    )
  })

  it('fecha o formulário após rejeitar com sucesso', async () => {
    render(<SolicitacoesPage />)
    fireEvent.click(screen.getByRole('button', { name: /rejeitar/i }))
    fireEvent.change(screen.getByLabelText(/justificativa/i), { target: { value: 'Ok' } })
    fireEvent.click(screen.getByRole('button', { name: /rejeitar/i }))

    await waitFor(() =>
      expect(screen.queryByLabelText(/justificativa/i)).not.toBeInTheDocument()
    )
  })

  it('exibe mensagem de erro quando rejeitar falha', async () => {
    mockRejeitar.mockRejectedValue(new Error('Falha ao rejeitar'))
    render(<SolicitacoesPage />)
    fireEvent.click(screen.getByRole('button', { name: /rejeitar/i }))
    fireEvent.change(screen.getByLabelText(/justificativa/i), { target: { value: 'Ok' } })
    fireEvent.click(screen.getByRole('button', { name: /rejeitar/i }))

    await waitFor(() =>
      expect(screen.getByText(/falha ao rejeitar/i)).toBeInTheDocument()
    )
  })
})

// ── Cancelar ──────────────────────────────────────────────────────────────────

describe('SolicitacoesPage — cancelar ação', () => {
  it('exibe botão cancelar quando formulário está aberto', () => {
    render(<SolicitacoesPage />)
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
  })

  it('fecha formulário ao clicar em cancelar', () => {
    render(<SolicitacoesPage />)
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(screen.queryByLabelText(/justificativa/i)).not.toBeInTheDocument()
  })
})
