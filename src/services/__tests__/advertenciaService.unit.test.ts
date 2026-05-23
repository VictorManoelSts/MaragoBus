import { advertenciaService } from '@/services/advertenciaService'
import { TipoAdvertencia } from '@/types/advertencia'

jest.mock('@/lib/firebase', () => ({ db: {} }))

const mockGetDocs = jest.fn()
const mockAddDoc = jest.fn()
const mockQuery = jest.fn()
const mockCollection = jest.fn()
const mockWhere = jest.fn()
const mockOrderBy = jest.fn()
const mockServerTimestamp = jest.fn(() => 'server-ts')

jest.mock('firebase/firestore', () => ({
  collection:      (...args: unknown[]) => mockCollection(...args),
  query:           (...args: unknown[]) => mockQuery(...args),
  where:           (...args: unknown[]) => mockWhere(...args),
  orderBy:         (...args: unknown[]) => mockOrderBy(...args),
  getDocs:         (...args: unknown[]) => mockGetDocs(...args),
  addDoc:          (...args: unknown[]) => mockAddDoc(...args),
  serverTimestamp: (...args: unknown[]) => mockServerTimestamp(...args),
}))

beforeEach(() => {
  jest.clearAllMocks()
  mockCollection.mockReturnValue('col-ref')
  mockQuery.mockReturnValue('query-ref')
  mockWhere.mockReturnValue('where-constraint')
  mockOrderBy.mockReturnValue('order-constraint')
})

function makeSnap(items: Array<{ id: string; [key: string]: unknown }>) {
  return { docs: items.map(({ id, ...dados }) => ({ id, data: () => dados })) }
}

describe('advertenciaService.buscarAdvertencias', () => {
  it('retorna lista de advertências do aluno', async () => {
    mockGetDocs.mockResolvedValue(makeSnap([
      { id: 'a1', alunoId: 'u1', motivo: 'Falta sem aviso', aplicadaPor: 'admin', tipo: TipoAdvertencia.Direta, data: {} },
      { id: 'a2', alunoId: 'u1', motivo: 'Comportamento inadequado', aplicadaPor: 'admin', tipo: TipoAdvertencia.Direta, data: {} },
    ]))
    const result = await advertenciaService.buscarAdvertencias('u1')
    expect(result).toHaveLength(2)
    expect(result[0].motivo).toBe('Falta sem aviso')
    expect(result[1].motivo).toBe('Comportamento inadequado')
  })

  it('retorna array vazio quando aluno não tem advertências', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] })
    const result = await advertenciaService.buscarAdvertencias('u1')
    expect(result).toHaveLength(0)
  })

  it('preserva o id do documento', async () => {
    mockGetDocs.mockResolvedValue(makeSnap([
      { id: 'abc-123', alunoId: 'u1', motivo: 'Falta', aplicadaPor: 'admin', tipo: TipoAdvertencia.Direta, data: {} },
    ]))
    const result = await advertenciaService.buscarAdvertencias('u1')
    expect(result[0].id).toBe('abc-123')
  })

  it('filtra por alunoId via where', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] })
    await advertenciaService.buscarAdvertencias('u1')
    expect(mockWhere).toHaveBeenCalledWith('alunoId', '==', 'u1')
  })

  it('ordena por data crescente via orderBy', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] })
    await advertenciaService.buscarAdvertencias('u1')
    expect(mockOrderBy).toHaveBeenCalledWith('data', 'asc')
  })
})

// ── aplicarAdvertencia ────────────────────────────────────────────────────────

describe('advertenciaService.aplicarAdvertencia', () => {
  it('usa a coleção advertencias', async () => {
    mockAddDoc.mockResolvedValue({ id: 'nova-adv' })

    await advertenciaService.aplicarAdvertencia('aluno-1', 'Falta injustificada', 'admin-99')

    expect(mockCollection).toHaveBeenCalledWith({}, 'advertencias')
  })

  it('salva o motivo correto', async () => {
    mockAddDoc.mockResolvedValue({ id: 'nova-adv' })

    await advertenciaService.aplicarAdvertencia('aluno-1', 'Falta injustificada', 'admin-99')

    expect(mockAddDoc).toHaveBeenCalledWith(
      'col-ref',
      expect.objectContaining({ motivo: 'Falta injustificada' })
    )
  })

  it('salva o alunoId correto', async () => {
    mockAddDoc.mockResolvedValue({ id: 'nova-adv' })

    await advertenciaService.aplicarAdvertencia('aluno-1', 'Falta', 'admin-99')

    expect(mockAddDoc).toHaveBeenCalledWith(
      'col-ref',
      expect.objectContaining({ alunoId: 'aluno-1' })
    )
  })

  it('salva o adminId como aplicadaPor', async () => {
    mockAddDoc.mockResolvedValue({ id: 'nova-adv' })

    await advertenciaService.aplicarAdvertencia('aluno-1', 'Falta', 'admin-99')

    expect(mockAddDoc).toHaveBeenCalledWith(
      'col-ref',
      expect.objectContaining({ aplicadaPor: 'admin-99' })
    )
  })

  it('salva tipo como Direta', async () => {
    mockAddDoc.mockResolvedValue({ id: 'nova-adv' })

    await advertenciaService.aplicarAdvertencia('aluno-1', 'Falta', 'admin-99')

    expect(mockAddDoc).toHaveBeenCalledWith(
      'col-ref',
      expect.objectContaining({ tipo: TipoAdvertencia.Direta })
    )
  })

  it('propaga erro quando addDoc falha', async () => {
    mockAddDoc.mockRejectedValue(new Error('Permissão negada'))

    await expect(
      advertenciaService.aplicarAdvertencia('aluno-1', 'Falta', 'admin-99')
    ).rejects.toThrow('Permissão negada')
  })
})
