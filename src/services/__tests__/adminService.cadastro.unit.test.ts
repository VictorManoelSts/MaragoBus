/**
 * Testes unitários para adminService.buscarPontos e adminService.cadastrarAluno — sem emulador.
 */

jest.mock('@/lib/firebase', () => ({ db: {}, storage: {}, functions: {} }))

const mockCollection = jest.fn()
const mockQuery = jest.fn()
const mockWhere = jest.fn()
const mockGetDocs = jest.fn()
const mockDoc = jest.fn()
const mockSetDoc = jest.fn()

jest.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  query:      (...args: unknown[]) => mockQuery(...args),
  where:      (...args: unknown[]) => mockWhere(...args),
  getDocs:    (...args: unknown[]) => mockGetDocs(...args),
  doc:        (...args: unknown[]) => mockDoc(...args),
  getDoc:     jest.fn(),
  updateDoc:  jest.fn(),
  writeBatch: jest.fn(),
  orderBy:    jest.fn(),
  setDoc:     (...args: unknown[]) => mockSetDoc(...args),
}))

const mockCriarUsuarioFn = jest.fn()
const mockHttpsCallable = jest.fn()

jest.mock('firebase/functions', () => ({
  httpsCallable: (...args: unknown[]) => mockHttpsCallable(...args),
}))

const mockRef = jest.fn()
const mockUploadBytes = jest.fn()
const mockGetDownloadURL = jest.fn()

jest.mock('firebase/storage', () => ({
  ref:            (...args: unknown[]) => mockRef(...args),
  uploadBytes:    (...args: unknown[]) => mockUploadBytes(...args),
  getDownloadURL: (...args: unknown[]) => mockGetDownloadURL(...args),
}))

import { adminService } from '@/services/adminService'
import { ModalidadeAluno } from '@/types/aluno'
import type { DadosCadastro } from '@/services/adminService'
import type { Ponto } from '@/types/ponto'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePontosSnap(pontos: Ponto[]) {
  return {
    docs: pontos.map((p) => ({
      id: p.id,
      data: () => ({ nome: p.nome, ativo: p.ativo }),
    })),
  }
}

function makeDados(overrides: Partial<DadosCadastro> = {}): DadosCadastro {
  return {
    nome: 'Alice Santos',
    cpf: '12345678901',
    senha: '789-01',
    telefone: '(82) 99999-0000',
    endereco: 'Rua das Flores, 100',
    foto: null,
    faculdade: 'UFAL',
    curso: 'Direito',
    modalidade: ModalidadeAluno.Presencial,
    semestre: 3,
    anoConclusao: 2027,
    pontoEmbarquePadrao: 'Ponto Central',
    ...overrides,
  }
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()

  mockCollection.mockReturnValue('col-ref')
  mockQuery.mockReturnValue('query-ref')
  mockWhere.mockReturnValue('where-ref')
  mockGetDocs.mockResolvedValue(makePontosSnap([]))
  mockDoc.mockReturnValue('doc-ref')
  mockSetDoc.mockResolvedValue(undefined)

  mockHttpsCallable.mockReturnValue(mockCriarUsuarioFn)
  mockCriarUsuarioFn.mockResolvedValue({ data: { uid: 'uid-gerado' } })

  mockRef.mockReturnValue('storage-ref')
  mockUploadBytes.mockResolvedValue(undefined)
  mockGetDownloadURL.mockResolvedValue('https://storage.example.com/foto.jpg')
})

// ── buscarPontos ──────────────────────────────────────────────────────────────

describe('adminService — buscarPontos', () => {
  it('filtra apenas pontos ativos via query where', async () => {
    mockGetDocs.mockResolvedValue(makePontosSnap([]))
    await adminService.buscarPontos()
    expect(mockWhere).toHaveBeenCalledWith('ativo', '==', true)
  })

  it('retorna lista mapeada de pontos', async () => {
    mockGetDocs.mockResolvedValue(makePontosSnap([
      { id: 'p1', nome: 'Ponto Central', ativo: true },
      { id: 'p2', nome: 'Ponto Norte',   ativo: true },
    ]))
    const result = await adminService.buscarPontos()
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ id: 'p1', nome: 'Ponto Central', ativo: true })
    expect(result[1]).toEqual({ id: 'p2', nome: 'Ponto Norte',   ativo: true })
  })

  it('retorna array vazio quando não há pontos', async () => {
    mockGetDocs.mockResolvedValue(makePontosSnap([]))
    const result = await adminService.buscarPontos()
    expect(result).toEqual([])
  })
})

// ── cadastrarAluno ────────────────────────────────────────────────────────────

describe('adminService — cadastrarAluno', () => {
  it('chama httpsCallable com "criarUsuario"', async () => {
    await adminService.cadastrarAluno(makeDados())
    expect(mockHttpsCallable).toHaveBeenCalledWith({}, 'criarUsuario')
  })

  it('invoca a Cloud Function com cpf e senha', async () => {
    await adminService.cadastrarAluno(makeDados({ cpf: '98765432100', senha: '432100' }))
    expect(mockCriarUsuarioFn).toHaveBeenCalledWith({ cpf: '98765432100', senha: '432100' })
  })

  it('cria documento no Firestore usando o uid retornado', async () => {
    mockCriarUsuarioFn.mockResolvedValue({ data: { uid: 'meu-uid' } })
    await adminService.cadastrarAluno(makeDados())
    expect(mockDoc).toHaveBeenCalledWith({}, 'alunos', 'meu-uid')
  })

  it('salva todos os campos corretos no documento', async () => {
    const dados = makeDados()
    await adminService.cadastrarAluno(dados)
    expect(mockSetDoc).toHaveBeenCalledWith('doc-ref', expect.objectContaining({
      nome: dados.nome,
      cpf: dados.cpf,
      telefone: dados.telefone,
      endereco: dados.endereco,
      faculdade: dados.faculdade,
      curso: dados.curso,
      modalidade: dados.modalidade,
      semestre: dados.semestre,
      anoConclusao: dados.anoConclusao,
      pontoEmbarquePadrao: dados.pontoEmbarquePadrao,
      primeiroAcesso: true,
    }))
  })

  it('salva foto: null quando foto não é fornecida', async () => {
    await adminService.cadastrarAluno(makeDados({ foto: null }))
    expect(mockSetDoc).toHaveBeenCalledWith('doc-ref', expect.objectContaining({ foto: null }))
    expect(mockUploadBytes).not.toHaveBeenCalled()
  })

  it('faz upload da foto quando fornecida e salva a URL', async () => {
    const file = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' })
    mockCriarUsuarioFn.mockResolvedValue({ data: { uid: 'uid-foto' } })

    await adminService.cadastrarAluno(makeDados({ foto: file }))

    expect(mockRef).toHaveBeenCalledWith({}, 'alunos/uid-foto/foto')
    expect(mockUploadBytes).toHaveBeenCalledWith('storage-ref', file)
    expect(mockSetDoc).toHaveBeenCalledWith('doc-ref', expect.objectContaining({
      foto: 'https://storage.example.com/foto.jpg',
    }))
  })

  it('retorna o uid criado', async () => {
    mockCriarUsuarioFn.mockResolvedValue({ data: { uid: 'uid-retornado' } })
    const uid = await adminService.cadastrarAluno(makeDados())
    expect(uid).toBe('uid-retornado')
  })

  it('propaga erro quando a Cloud Function falha', async () => {
    mockCriarUsuarioFn.mockRejectedValue(new Error('CPF já cadastrado'))
    await expect(adminService.cadastrarAluno(makeDados())).rejects.toThrow('CPF já cadastrado')
  })

  it('não chama setDoc quando a Cloud Function falha', async () => {
    mockCriarUsuarioFn.mockRejectedValue(new Error('Erro'))
    await adminService.cadastrarAluno(makeDados()).catch(() => {})
    expect(mockSetDoc).not.toHaveBeenCalled()
  })
})
