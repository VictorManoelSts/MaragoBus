/**
 * Testes unitários do feriadoService — sem emulador.
 */

jest.mock('@/lib/firebase', () => ({ db: {} }))

const mockFetch = jest.fn()
global.fetch = mockFetch

const mockCollection = jest.fn()
const mockDoc = jest.fn()
const mockGetDocs = jest.fn()
const mockAddDoc = jest.fn()
const mockDeleteDoc = jest.fn()
const mockQuery = jest.fn()
const mockWhere = jest.fn()
const mockOrderBy = jest.fn()

jest.mock('firebase/firestore', () => ({
  collection:  (...args: unknown[]) => mockCollection(...args),
  query:       (...args: unknown[]) => mockQuery(...args),
  where:       (...args: unknown[]) => mockWhere(...args),
  orderBy:     (...args: unknown[]) => mockOrderBy(...args),
  getDocs:     (...args: unknown[]) => mockGetDocs(...args),
  addDoc:      (...args: unknown[]) => mockAddDoc(...args),
  doc:         (...args: unknown[]) => mockDoc(...args),
  deleteDoc:   (...args: unknown[]) => mockDeleteDoc(...args),
}))

import { feriadoService } from '@/services/feriadoService'
import { TipoFeriado } from '@/types/feriado'
import type { Feriado } from '@/types/feriado'

function makeFeriado(id: string, data: string, tipo: TipoFeriado = TipoFeriado.Nacional): Feriado {
  return { id, data, nome: `Feriado ${id}`, tipo }
}

function makeFirestoreSnap(items: Feriado[]) {
  return {
    docs: items.map(f => ({
      id: f.id,
      data: () => ({ data: f.data, nome: f.nome, tipo: f.tipo }),
    })),
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCollection.mockReturnValue('col-ref')
  mockDoc.mockReturnValue('doc-ref')
  mockQuery.mockReturnValue('query-ref')
  mockWhere.mockReturnValue('where-ref')
  mockOrderBy.mockReturnValue('orderby-ref')
  mockAddDoc.mockResolvedValue({ id: 'novo-id' })
  mockDeleteDoc.mockResolvedValue(undefined)
})

// ── buscarFeriadosNacionaisBrasil ─────────────────────────────────────────────

describe('feriadoService — buscarFeriadosNacionaisBrasil', () => {
  it('busca do endpoint correto para o ano', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] })
    await feriadoService.buscarFeriadosNacionaisBrasil(2026)
    expect(mockFetch).toHaveBeenCalledWith('https://brasilapi.com.br/api/feriados/v1/2026')
  })

  it('retorna lista vazia quando API retorna vazio', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] })
    const resultado = await feriadoService.buscarFeriadosNacionaisBrasil(2026)
    expect(resultado).toEqual([])
  })

  it('mapeia resposta da BrasilAPI para Feriado[]', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        { date: '2026-01-01', name: 'Confraternização Universal', type: 'national' },
        { date: '2026-04-21', name: 'Tiradentes', type: 'national' },
      ],
    })
    const resultado = await feriadoService.buscarFeriadosNacionaisBrasil(2026)
    expect(resultado).toHaveLength(2)
    expect(resultado[0]).toMatchObject({ data: '2026-01-01', nome: 'Confraternização Universal', tipo: TipoFeriado.Nacional })
    expect(resultado[1]).toMatchObject({ data: '2026-04-21', nome: 'Tiradentes', tipo: TipoFeriado.Nacional })
  })

  it('gera id local a partir da data', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ date: '2026-01-01', name: 'Ano Novo', type: 'national' }],
    })
    const resultado = await feriadoService.buscarFeriadosNacionaisBrasil(2026)
    expect(resultado[0].id).toBe('brasil-2026-01-01')
  })

  it('lança erro quando resposta não é ok', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 })
    await expect(feriadoService.buscarFeriadosNacionaisBrasil(2026)).rejects.toThrow('BrasilAPI indisponível')
  })
})

// ── buscarFeriados ────────────────────────────────────────────────────────────

describe('feriadoService — buscarFeriados', () => {
  it('filtra por ano no Firestore', async () => {
    mockGetDocs.mockResolvedValue(makeFirestoreSnap([]))
    await feriadoService.buscarFeriados(2026)
    expect(mockWhere).toHaveBeenCalledWith('data', '>=', '2026-01-01')
    expect(mockWhere).toHaveBeenCalledWith('data', '<=', '2026-12-31')
  })

  it('ordena por data ascendente', async () => {
    mockGetDocs.mockResolvedValue(makeFirestoreSnap([]))
    await feriadoService.buscarFeriados(2026)
    expect(mockOrderBy).toHaveBeenCalledWith('data', 'asc')
  })

  it('retorna [] quando não há feriados', async () => {
    mockGetDocs.mockResolvedValue(makeFirestoreSnap([]))
    const resultado = await feriadoService.buscarFeriados(2026)
    expect(resultado).toEqual([])
  })

  it('mapeia documentos do Firestore para Feriado[]', async () => {
    mockGetDocs.mockResolvedValue(makeFirestoreSnap([
      makeFeriado('f1', '2026-01-01', TipoFeriado.Nacional),
      makeFeriado('f2', '2026-06-24', TipoFeriado.Regional),
    ]))
    const resultado = await feriadoService.buscarFeriados(2026)
    expect(resultado).toHaveLength(2)
    expect(resultado[0]).toMatchObject({ id: 'f1', data: '2026-01-01', tipo: TipoFeriado.Nacional })
    expect(resultado[1]).toMatchObject({ id: 'f2', data: '2026-06-24', tipo: TipoFeriado.Regional })
  })
})

// ── adicionarFeriado ──────────────────────────────────────────────────────────

describe('feriadoService — adicionarFeriado', () => {
  it('salva na coleção feriados', async () => {
    await feriadoService.adicionarFeriado('2026-06-24', 'São João', TipoFeriado.Regional)
    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), 'feriados')
  })

  it('adiciona com os campos corretos', async () => {
    await feriadoService.adicionarFeriado('2026-06-24', 'São João', TipoFeriado.Regional)
    expect(mockAddDoc).toHaveBeenCalledWith('col-ref', {
      data: '2026-06-24',
      nome: 'São João',
      tipo: TipoFeriado.Regional,
    })
  })

  it('retorna o ID do documento criado', async () => {
    mockAddDoc.mockResolvedValue({ id: 'feriado-xpto' })
    const id = await feriadoService.adicionarFeriado('2026-06-24', 'São João', TipoFeriado.Regional)
    expect(id).toBe('feriado-xpto')
  })
})

// ── removerFeriado ────────────────────────────────────────────────────────────

describe('feriadoService — removerFeriado', () => {
  it('deleta o documento pelo ID', async () => {
    await feriadoService.removerFeriado('f1')
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'feriados', 'f1')
    expect(mockDeleteDoc).toHaveBeenCalledWith('doc-ref')
  })
})

// ── sincronizarNacionais ──────────────────────────────────────────────────────

describe('feriadoService — sincronizarNacionais', () => {
  it('adiciona nacionais do BrasilAPI que ainda não estão no Firestore', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        { date: '2026-01-01', name: 'Ano Novo', type: 'national' },
        { date: '2026-04-21', name: 'Tiradentes', type: 'national' },
      ],
    })
    mockGetDocs.mockResolvedValue(makeFirestoreSnap([
      makeFeriado('f1', '2026-01-01', TipoFeriado.Nacional),
    ]))

    await feriadoService.sincronizarNacionais(2026)

    expect(mockAddDoc).toHaveBeenCalledTimes(1)
    expect(mockAddDoc).toHaveBeenCalledWith('col-ref', expect.objectContaining({
      data: '2026-04-21',
      nome: 'Tiradentes',
      tipo: TipoFeriado.Nacional,
    }))
  })

  it('não adiciona nada quando todos já estão no Firestore', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ date: '2026-01-01', name: 'Ano Novo', type: 'national' }],
    })
    mockGetDocs.mockResolvedValue(makeFirestoreSnap([
      makeFeriado('f1', '2026-01-01', TipoFeriado.Nacional),
    ]))

    await feriadoService.sincronizarNacionais(2026)

    expect(mockAddDoc).not.toHaveBeenCalled()
  })

  it('adiciona nacional mesmo quando há regional na mesma data', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ date: '2026-06-24', name: 'São João Federal', type: 'national' }],
    })
    mockGetDocs.mockResolvedValue(makeFirestoreSnap([
      makeFeriado('f1', '2026-06-24', TipoFeriado.Regional),
    ]))

    await feriadoService.sincronizarNacionais(2026)

    expect(mockAddDoc).toHaveBeenCalledTimes(1)
    expect(mockAddDoc).toHaveBeenCalledWith('col-ref', expect.objectContaining({
      data: '2026-06-24',
      tipo: TipoFeriado.Nacional,
    }))
  })
})

// ── verificarAvisos ───────────────────────────────────────────────────────────

describe('feriadoService — verificarAvisos', () => {
  const AGORA = new Date('2026-05-24T10:00:00')

  const FERIADOS: Feriado[] = [
    makeFeriado('f-3d', '2026-05-27', TipoFeriado.Nacional),
    makeFeriado('f-1d', '2026-05-25', TipoFeriado.Regional),
    makeFeriado('f-2d', '2026-05-26', TipoFeriado.Avulso),
    makeFeriado('f-4d', '2026-05-28', TipoFeriado.Nacional),
    makeFeriado('f-hj', '2026-05-24', TipoFeriado.Nacional),
    makeFeriado('f-ps', '2026-05-23', TipoFeriado.Nacional),
  ]

  it('retorna feriado a exatamente 3 dias', () => {
    const avisos = feriadoService.verificarAvisos(FERIADOS, AGORA)
    expect(avisos.some(f => f.id === 'f-3d')).toBe(true)
  })

  it('retorna feriado a exatamente 1 dia', () => {
    const avisos = feriadoService.verificarAvisos(FERIADOS, AGORA)
    expect(avisos.some(f => f.id === 'f-1d')).toBe(true)
  })

  it('não retorna feriados fora das janelas de aviso', () => {
    const avisos = feriadoService.verificarAvisos(FERIADOS, AGORA)
    expect(avisos.some(f => f.id === 'f-2d')).toBe(false)
    expect(avisos.some(f => f.id === 'f-4d')).toBe(false)
    expect(avisos.some(f => f.id === 'f-hj')).toBe(false)
    expect(avisos.some(f => f.id === 'f-ps')).toBe(false)
  })

  it('retorna exatamente 2 avisos no cenário de teste', () => {
    const avisos = feriadoService.verificarAvisos(FERIADOS, AGORA)
    expect(avisos).toHaveLength(2)
  })

  it('retorna [] quando feriados está vazio', () => {
    expect(feriadoService.verificarAvisos([], AGORA)).toEqual([])
  })
})
