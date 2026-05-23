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
const mockDoc = jest.fn()
const mockGetDoc = jest.fn()
const mockGetDocs = jest.fn()
const mockQuery = jest.fn()
const mockWhere = jest.fn()

jest.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
}))

import { motoristaService } from '@/services/motoristaService'
import { StatusAluno, ModalidadeAluno } from '@/types/aluno'
import { StatusSolicitacao } from '@/types/advertencia'
import type { Aluno } from '@/types/aluno'

const ALUNO_FIXTURE: Omit<Aluno, 'id'> = {
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

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.currentUser = { uid: 'motorista-uid-1' }
  mockCollection.mockReturnValue('col-ref')
  mockDoc.mockReturnValue('doc-ref')
  mockQuery.mockReturnValue('query-ref')
  mockWhere.mockReturnValue('where-ref')
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

// ── buscarDetalheAluno ────────────────────────────────────────────────────────

describe('motoristaService — buscarDetalheAluno', () => {
  const AGORA = new Date(2026, 4, 23, 8, 0) // 2026-05-23 08h

  it('retorna aluno e ponto da reserva de hoje', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'aluno-1',
      data: () => ALUNO_FIXTURE,
    })
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{ data: () => ({ pontoEscolhido: 'Ponto Central' }) }],
    })

    const resultado = await motoristaService.buscarDetalheAluno('aluno-1', AGORA)

    expect(resultado.aluno).toMatchObject({ id: 'aluno-1', nome: 'Luana Beatriz' })
    expect(resultado.pontoEscolhido).toBe('Ponto Central')
  })

  it('retorna pontoEscolhido null quando não há reserva hoje', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'aluno-1',
      data: () => ALUNO_FIXTURE,
    })
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] })

    const resultado = await motoristaService.buscarDetalheAluno('aluno-1', AGORA)

    expect(resultado.pontoEscolhido).toBeNull()
  })

  it('lança erro quando aluno não existe', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false })

    await expect(
      motoristaService.buscarDetalheAluno('inexistente', AGORA)
    ).rejects.toThrow('Aluno não encontrado.')
  })

  it('busca reserva com alunoId e data de hoje corretos', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'aluno-1',
      data: () => ALUNO_FIXTURE,
    })
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] })

    await motoristaService.buscarDetalheAluno('aluno-1', AGORA)

    expect(mockWhere).toHaveBeenCalledWith('alunoId', '==', 'aluno-1')
    expect(mockWhere).toHaveBeenCalledWith('data', '==', '2026-05-23')
  })
})
