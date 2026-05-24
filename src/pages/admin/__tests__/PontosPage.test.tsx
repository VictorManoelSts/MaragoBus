import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { PontosPage } from '@/pages/admin/PontosPage'
import type { UsePontosReturn } from '@/hooks/usePontos'
import type { Ponto } from '@/types/ponto'

// ── Mock do hook ──────────────────────────────────────────────────────────────

const mockAdicionar = jest.fn()
const mockEditar    = jest.fn()
const mockRemover   = jest.fn()

let hookRetorno: UsePontosReturn

jest.mock('@/hooks/usePontos', () => ({
  usePontos: () => hookRetorno,
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PONTOS: Ponto[] = [
  { id: 'p1', nome: 'Praça Central', ativo: true },
  { id: 'p2', nome: 'Terminal Rodoviário', ativo: true },
]

function montarHook(overrides: Partial<UsePontosReturn> = {}) {
  hookRetorno = {
    pontos: PONTOS,
    carregando: false,
    erro: null,
    adicionar: mockAdicionar,
    editar: mockEditar,
    remover: mockRemover,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAdicionar.mockResolvedValue(undefined)
  mockEditar.mockResolvedValue(undefined)
  mockRemover.mockResolvedValue(undefined)
  montarHook()
})

// ── Renderização básica ───────────────────────────────────────────────────────

describe('PontosPage — renderização', () => {
  it('renderiza o título "Pontos de Embarque"', () => {
    render(<PontosPage />)
    expect(screen.getByText('Pontos de Embarque')).toBeInTheDocument()
  })

  it('renderiza o botão "Novo ponto"', () => {
    render(<PontosPage />)
    expect(screen.getByRole('button', { name: /novo ponto/i })).toBeInTheDocument()
  })
})

// ── Carregando ────────────────────────────────────────────────────────────────

describe('PontosPage — carregando', () => {
  it('exibe spinner enquanto carregando=true', () => {
    montarHook({ carregando: true, pontos: [] })
    render(<PontosPage />)
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('não exibe lista enquanto carregando=true', () => {
    montarHook({ carregando: true, pontos: [] })
    render(<PontosPage />)
    expect(screen.queryByTestId('lista-pontos')).not.toBeInTheDocument()
  })

  it('exibe lista quando carregando=false', () => {
    render(<PontosPage />)
    expect(screen.getByTestId('lista-pontos')).toBeInTheDocument()
  })
})

// ── Erro de carregamento ──────────────────────────────────────────────────────

describe('PontosPage — erro de carregamento', () => {
  it('exibe mensagem de erro quando erro está definido', () => {
    montarHook({ erro: 'Sem conexão com o servidor.', pontos: [] })
    render(<PontosPage />)
    expect(screen.getByText('Sem conexão com o servidor.')).toBeInTheDocument()
  })

  it('não exibe lista quando há erro', () => {
    montarHook({ erro: 'Erro', pontos: [] })
    render(<PontosPage />)
    expect(screen.queryByTestId('lista-pontos')).not.toBeInTheDocument()
  })
})

// ── Lista de pontos ───────────────────────────────────────────────────────────

describe('PontosPage — lista', () => {
  it('renderiza o nome de cada ponto', () => {
    render(<PontosPage />)
    expect(screen.getByText('Praça Central')).toBeInTheDocument()
    expect(screen.getByText('Terminal Rodoviário')).toBeInTheDocument()
  })

  it('renderiza botão de editar para cada ponto', () => {
    render(<PontosPage />)
    expect(screen.getByTestId('btn-editar-p1')).toBeInTheDocument()
    expect(screen.getByTestId('btn-editar-p2')).toBeInTheDocument()
  })

  it('renderiza botão de remover para cada ponto', () => {
    render(<PontosPage />)
    expect(screen.getByTestId('btn-remover-p1')).toBeInTheDocument()
    expect(screen.getByTestId('btn-remover-p2')).toBeInTheDocument()
  })
})

// ── Empty state ───────────────────────────────────────────────────────────────

describe('PontosPage — empty state', () => {
  it('exibe empty state quando não há pontos', () => {
    montarHook({ pontos: [] })
    render(<PontosPage />)
    expect(screen.getByText('Nenhum ponto cadastrado')).toBeInTheDocument()
  })

  it('não exibe empty state quando há pontos', () => {
    render(<PontosPage />)
    expect(screen.queryByText('Nenhum ponto cadastrado')).not.toBeInTheDocument()
  })
})

// ── Adicionar ponto ───────────────────────────────────────────────────────────

describe('PontosPage — adicionar', () => {
  it('formulário fica oculto inicialmente', () => {
    render(<PontosPage />)
    expect(screen.queryByTestId('form-adicionar')).not.toBeInTheDocument()
  })

  it('exibe formulário ao clicar em "Novo ponto"', () => {
    render(<PontosPage />)
    fireEvent.click(screen.getByRole('button', { name: /novo ponto/i }))
    expect(screen.getByTestId('form-adicionar')).toBeInTheDocument()
  })

  it('fecha formulário ao clicar em "Cancelar"', () => {
    render(<PontosPage />)
    fireEvent.click(screen.getByRole('button', { name: /novo ponto/i }))
    fireEvent.click(within(screen.getByTestId('form-adicionar')).getByRole('button', { name: /cancelar/i }))
    expect(screen.queryByTestId('form-adicionar')).not.toBeInTheDocument()
  })

  it('exibe erro de validação quando nome está vazio', async () => {
    render(<PontosPage />)
    fireEvent.click(screen.getByRole('button', { name: /novo ponto/i }))
    const form = screen.getByTestId('form-adicionar')
    fireEvent.submit(form)
    expect(await screen.findByTestId('erro-nome')).toBeInTheDocument()
  })

  it('não chama adicionar quando nome está vazio', async () => {
    render(<PontosPage />)
    fireEvent.click(screen.getByRole('button', { name: /novo ponto/i }))
    fireEvent.submit(screen.getByTestId('form-adicionar'))
    expect(mockAdicionar).not.toHaveBeenCalled()
  })

  it('chama adicionar com o nome digitado ao submeter', async () => {
    render(<PontosPage />)
    fireEvent.click(screen.getByRole('button', { name: /novo ponto/i }))
    const form = screen.getByTestId('form-adicionar')
    fireEvent.change(within(form).getByTestId('input-nome'), {
      target: { value: 'Nova Parada' },
    })
    fireEvent.submit(form)
    await waitFor(() => expect(mockAdicionar).toHaveBeenCalledWith('Nova Parada'))
  })

  it('fecha formulário após adicionar com sucesso', async () => {
    render(<PontosPage />)
    fireEvent.click(screen.getByRole('button', { name: /novo ponto/i }))
    const form = screen.getByTestId('form-adicionar')
    fireEvent.change(within(form).getByTestId('input-nome'), {
      target: { value: 'Nova Parada' },
    })
    fireEvent.submit(form)
    await waitFor(() => expect(screen.queryByTestId('form-adicionar')).not.toBeInTheDocument())
  })

  it('limpa o input após cancelar', () => {
    render(<PontosPage />)
    fireEvent.click(screen.getByRole('button', { name: /novo ponto/i }))
    const form = screen.getByTestId('form-adicionar')
    fireEvent.change(within(form).getByTestId('input-nome'), {
      target: { value: 'Teste' },
    })
    fireEvent.click(within(form).getByRole('button', { name: /cancelar/i }))
    fireEvent.click(screen.getByRole('button', { name: /novo ponto/i }))
    expect((screen.getByTestId('input-nome') as HTMLInputElement).value).toBe('')
  })
})

// ── Editar ponto ──────────────────────────────────────────────────────────────

describe('PontosPage — editar', () => {
  it('exibe input inline ao clicar em editar', () => {
    render(<PontosPage />)
    fireEvent.click(screen.getByTestId('btn-editar-p1'))
    expect(screen.getByTestId('input-editar-p1')).toBeInTheDocument()
  })

  it('input começa com o nome atual do ponto', () => {
    render(<PontosPage />)
    fireEvent.click(screen.getByTestId('btn-editar-p1'))
    expect((screen.getByTestId('input-editar-p1') as HTMLInputElement).value).toBe('Praça Central')
  })

  it('cancela edição ao clicar em cancelar', () => {
    render(<PontosPage />)
    fireEvent.click(screen.getByTestId('btn-editar-p1'))
    const item = screen.getByTestId('item-ponto-p1')
    fireEvent.click(within(item).getByRole('button', { name: /cancelar/i }))
    expect(screen.queryByTestId('input-editar-p1')).not.toBeInTheDocument()
  })

  it('chama editar com id e novo nome ao salvar', async () => {
    render(<PontosPage />)
    fireEvent.click(screen.getByTestId('btn-editar-p1'))
    fireEvent.change(screen.getByTestId('input-editar-p1'), {
      target: { value: 'Praça Nova' },
    })
    const item = screen.getByTestId('item-ponto-p1')
    fireEvent.click(within(item).getByRole('button', { name: /salvar/i }))
    await waitFor(() => expect(mockEditar).toHaveBeenCalledWith('p1', 'Praça Nova'))
  })

  it('fecha o input após salvar com sucesso', async () => {
    render(<PontosPage />)
    fireEvent.click(screen.getByTestId('btn-editar-p1'))
    const item = screen.getByTestId('item-ponto-p1')
    fireEvent.click(within(item).getByRole('button', { name: /salvar/i }))
    await waitFor(() => expect(screen.queryByTestId('input-editar-p1')).not.toBeInTheDocument())
  })

  it('exibe apenas um input inline por vez', () => {
    render(<PontosPage />)
    fireEvent.click(screen.getByTestId('btn-editar-p1'))
    expect(screen.queryByTestId('btn-editar-p2')).not.toBeInTheDocument()
  })
})

// ── Remover ponto ─────────────────────────────────────────────────────────────

describe('PontosPage — remover', () => {
  it('chama remover com id e nome corretos', async () => {
    render(<PontosPage />)
    fireEvent.click(screen.getByTestId('btn-remover-p1'))
    await waitFor(() => expect(mockRemover).toHaveBeenCalledWith('p1', 'Praça Central'))
  })

  it('exibe erro quando remoção é bloqueada', async () => {
    mockRemover.mockRejectedValue(
      new Error('Ponto em uso. Existem alunos com este ponto como padrão.')
    )
    render(<PontosPage />)
    fireEvent.click(screen.getByTestId('btn-remover-p1'))
    expect(await screen.findByTestId('erro-remocao')).toBeInTheDocument()
    expect(screen.getByTestId('erro-remocao')).toHaveTextContent(
      'Ponto em uso. Existem alunos com este ponto como padrão.'
    )
  })

  it('esconde erro de remoção anterior ao tentar nova remoção', async () => {
    mockRemover.mockRejectedValueOnce(new Error('Ponto em uso.'))
    mockRemover.mockResolvedValue(undefined)
    render(<PontosPage />)
    fireEvent.click(screen.getByTestId('btn-remover-p1'))
    await screen.findByTestId('erro-remocao')
    fireEvent.click(screen.getByTestId('btn-remover-p2'))
    await waitFor(() => expect(screen.queryByTestId('erro-remocao')).not.toBeInTheDocument())
  })
})
