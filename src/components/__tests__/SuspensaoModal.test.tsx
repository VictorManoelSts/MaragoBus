import { render, screen, fireEvent } from '@testing-library/react'
import { SuspensaoModal } from '@/components/SuspensaoModal'
import { TipoAdvertencia } from '@/types/advertencia'
import type { Advertencia } from '@/types/advertencia'
import type { Timestamp } from 'firebase/firestore'

function makeTimestamp(dateStr: string): Timestamp {
  return { toDate: () => new Date(dateStr) } as unknown as Timestamp
}

const advertencias: Advertencia[] = [
  {
    id: 'a1', alunoId: 'u1', motivo: 'Falta sem aviso',
    aplicadaPor: 'admin', tipo: TipoAdvertencia.Direta,
    data: makeTimestamp('2025-05-01'),
  },
  {
    id: 'a2', alunoId: 'u1', motivo: 'Comportamento inadequado',
    aplicadaPor: 'admin', tipo: TipoAdvertencia.Direta,
    data: makeTimestamp('2025-05-10'),
  },
  {
    id: 'a3', alunoId: 'u1', motivo: 'Ausência repetida',
    aplicadaPor: 'admin', tipo: TipoAdvertencia.Direta,
    data: makeTimestamp('2025-05-15'),
  },
]

const mockFechar = jest.fn()

beforeEach(() => jest.clearAllMocks())

describe('SuspensaoModal — estrutura', () => {
  it('tem role=dialog para acessibilidade', () => {
    render(<SuspensaoModal advertencias={advertencias} dataReativacao="2025-05-28" onFechar={mockFechar} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('exibe título "Acesso suspenso"', () => {
    render(<SuspensaoModal advertencias={advertencias} dataReativacao="2025-05-28" onFechar={mockFechar} />)
    expect(screen.getByText('Acesso suspenso')).toBeInTheDocument()
  })

  it('renderiza overlay de fundo', () => {
    render(<SuspensaoModal advertencias={advertencias} dataReativacao="2025-05-28" onFechar={mockFechar} />)
    const overlay = screen.getByRole('dialog').parentElement
    expect(overlay?.className).toMatch(/fixed/)
  })
})

describe('SuspensaoModal — data de reativação', () => {
  it('exibe data de reativação formatada (DD/MM/YYYY)', () => {
    render(<SuspensaoModal advertencias={advertencias} dataReativacao="2025-05-28" onFechar={mockFechar} />)
    expect(screen.getByText('Reativação em: 28/05/2025')).toBeInTheDocument()
  })

  it('não exibe linha de reativação quando dataReativacao é null', () => {
    render(<SuspensaoModal advertencias={advertencias} dataReativacao={null} onFechar={mockFechar} />)
    expect(screen.queryByText(/Reativação em:/)).not.toBeInTheDocument()
  })
})

describe('SuspensaoModal — lista de advertências', () => {
  it('exibe o motivo de cada advertência', () => {
    render(<SuspensaoModal advertencias={advertencias} dataReativacao="2025-05-28" onFechar={mockFechar} />)
    expect(screen.getByText('Falta sem aviso')).toBeInTheDocument()
    expect(screen.getByText('Comportamento inadequado')).toBeInTheDocument()
    expect(screen.getByText('Ausência repetida')).toBeInTheDocument()
  })

  it('exibe a data de cada advertência no formato brasileiro', () => {
    render(<SuspensaoModal advertencias={advertencias} dataReativacao="2025-05-28" onFechar={mockFechar} />)
    expect(screen.getByText('01/05/2025')).toBeInTheDocument()
    expect(screen.getByText('10/05/2025')).toBeInTheDocument()
    expect(screen.getByText('15/05/2025')).toBeInTheDocument()
  })
})

describe('SuspensaoModal — botão Entendido', () => {
  it('exibe o botão "Entendido"', () => {
    render(<SuspensaoModal advertencias={advertencias} dataReativacao="2025-05-28" onFechar={mockFechar} />)
    expect(screen.getByRole('button', { name: /entendido/i })).toBeInTheDocument()
  })

  it('chama onFechar ao clicar em "Entendido"', () => {
    render(<SuspensaoModal advertencias={advertencias} dataReativacao="2025-05-28" onFechar={mockFechar} />)
    fireEvent.click(screen.getByRole('button', { name: /entendido/i }))
    expect(mockFechar).toHaveBeenCalledTimes(1)
  })
})
