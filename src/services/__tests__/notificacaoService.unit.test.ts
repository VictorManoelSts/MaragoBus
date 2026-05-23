import { notificacaoService } from '@/services/notificacaoService'
import { TipoNotificacao } from '@/types/notificacao'

jest.mock('@/lib/firebase', () => ({ db: {} }))

const mockGetDocs = jest.fn()
const mockUpdateDoc = jest.fn()
const mockQuery = jest.fn()
const mockCollection = jest.fn()
const mockWhere = jest.fn()
const mockOrderBy = jest.fn()
const mockDoc = jest.fn()

jest.mock('firebase/firestore', () => ({
  collection: (...a: unknown[]) => mockCollection(...a),
  query: (...a: unknown[]) => mockQuery(...a),
  where: (...a: unknown[]) => mockWhere(...a),
  orderBy: (...a: unknown[]) => mockOrderBy(...a),
  getDocs: (...a: unknown[]) => mockGetDocs(...a),
  doc: (...a: unknown[]) => mockDoc(...a),
  updateDoc: (...a: unknown[]) => mockUpdateDoc(...a),
}))

function makeSnap(items: Array<{ id: string; [k: string]: unknown }>) {
  return { docs: items.map(({ id, ...d }) => ({ id, data: () => d })) }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCollection.mockReturnValue('col-ref')
  mockQuery.mockReturnValue('query-ref')
  mockWhere.mockReturnValue('where-constraint')
  mockOrderBy.mockReturnValue('order-constraint')
  mockDoc.mockReturnValue('doc-ref')
})

const base = {
  alunoId: 'u1', tipo: TipoNotificacao.AberturaReservas,
  titulo: 'Reservas abertas', mensagem: 'As reservas estão abertas.',
  lida: false, criadaEm: {},
}

describe('notificacaoService.buscarNotificacoes', () => {
  it('retorna lista de notificações', async () => {
    mockGetDocs.mockResolvedValue(makeSnap([
      { id: 'n1', ...base },
      { id: 'n2', ...base, tipo: TipoNotificacao.Advertencia, titulo: 'Advertência' },
    ]))
    const result = await notificacaoService.buscarNotificacoes('u1')
    expect(result).toHaveLength(2)
    expect(result[0].titulo).toBe('Reservas abertas')
  })

  it('retorna array vazio quando não há notificações', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] })
    const result = await notificacaoService.buscarNotificacoes('u1')
    expect(result).toHaveLength(0)
  })

  it('preserva o id do documento', async () => {
    mockGetDocs.mockResolvedValue(makeSnap([{ id: 'notif-xyz', ...base }]))
    const result = await notificacaoService.buscarNotificacoes('u1')
    expect(result[0].id).toBe('notif-xyz')
  })

  it('filtra por alunoId via where', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] })
    await notificacaoService.buscarNotificacoes('u1')
    expect(mockWhere).toHaveBeenCalledWith('alunoId', '==', 'u1')
  })

  it('ordena por criadaEm descendente', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] })
    await notificacaoService.buscarNotificacoes('u1')
    expect(mockOrderBy).toHaveBeenCalledWith('criadaEm', 'desc')
  })
})

describe('notificacaoService.marcarComoLida', () => {
  it('chama updateDoc na coleção notificacoes', async () => {
    mockUpdateDoc.mockResolvedValue(undefined)
    await notificacaoService.marcarComoLida('n1')
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'notificacoes', 'n1')
    expect(mockUpdateDoc).toHaveBeenCalledWith('doc-ref', { lida: true })
  })
})
