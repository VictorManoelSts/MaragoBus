/**
 * Testes unitários de motoristaService — funções que não dependem de emulador.
 */

const mockAuth = { currentUser: { uid: 'motorista-uid-1' } as { uid: string } | null }

jest.mock('@/lib/firebase', () => ({
  auth: mockAuth,
  db: {},
}))

const mockAddDoc = jest.fn()
const mockCollection = jest.fn()

jest.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
}))

import { motoristaService } from '@/services/motoristaService'
import { StatusSolicitacao } from '@/types/advertencia'

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.currentUser = { uid: 'motorista-uid-1' }
  mockCollection.mockReturnValue('col-ref')
  mockAddDoc.mockResolvedValue({ id: 'sol-gerada' })
})

// ── solicitarAdvertencia ──────────────────────────────────────────────────────

describe('motoristaService — solicitarAdvertencia', () => {
  it('salva na coleção solicitacoes com status pendente', async () => {
    await motoristaService.solicitarAdvertencia('aluno-42', 'Faltou sem avisar')

    expect(mockCollection).toHaveBeenCalledWith({}, 'solicitacoes')
    expect(mockAddDoc).toHaveBeenCalledWith(
      'col-ref',
      expect.objectContaining({
        alunoId: 'aluno-42',
        motoristaId: 'motorista-uid-1',
        motivo: 'Faltou sem avisar',
        status: StatusSolicitacao.Pendente,
      })
    )
  })

  it('inclui campo data no documento', async () => {
    await motoristaService.solicitarAdvertencia('aluno-42', 'Motivo qualquer')

    const chamado = mockAddDoc.mock.calls[0][1]
    expect(chamado.data).toBeInstanceOf(Date)
  })

  it('lança erro quando não há usuário autenticado', async () => {
    mockAuth.currentUser = null

    await expect(
      motoristaService.solicitarAdvertencia('aluno-42', 'Motivo')
    ).rejects.toThrow('Não autenticado')

    expect(mockAddDoc).not.toHaveBeenCalled()
  })
})
