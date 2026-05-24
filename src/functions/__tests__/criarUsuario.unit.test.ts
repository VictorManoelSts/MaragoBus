/**
 * Testes unitários do handler criarUsuario — sem emulador.
 *
 * O handler é disparado ao criar um documento em /alunos ou /motoristas.
 * Testa: criação do usuário no Auth, custom claims e atualização do documento.
 */

// ── Mocks do firebase-admin ───────────────────────────────────────────────────

const mockCreateUser          = jest.fn()
const mockSetCustomUserClaims = jest.fn()
const mockUpdate              = jest.fn()
const mockDoc                 = jest.fn(() => ({ update: mockUpdate }))
const mockCollection          = jest.fn(() => ({ doc: mockDoc }))

jest.mock('firebase-admin', () => ({
  __esModule: true,
  default: {
    apps: [{ name: '[DEFAULT]' }],
    initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
    auth: jest.fn(() => ({
      createUser:          (...args: unknown[]) => mockCreateUser(...args),
      setCustomUserClaims: (...args: unknown[]) => mockSetCustomUserClaims(...args),
    })),
    firestore: Object.assign(
      jest.fn(() => ({
        collection: (...args: unknown[]) => mockCollection(...args),
      })),
      {
        FieldValue: { delete: jest.fn(() => 'FIELD_DELETE') },
      }
    ),
  },
}))

import { criarUsuario } from '@/functions/criarUsuario'

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  // Simula o Auth retornando o uid que foi passado (comportamento real do Firebase)
  mockCreateUser.mockImplementation(async ({ uid }: { uid: string }) => ({ uid }))
  mockSetCustomUserClaims.mockResolvedValue(undefined)
  mockUpdate.mockResolvedValue(undefined)
})

// ── criarUsuario — aluno ──────────────────────────────────────────────────────

describe('criarUsuario — aluno', () => {
  const DADOS = { cpf: '12345678901', senha: 'senha123' }

  it('chama createUser com email CPF@maragobus.app', async () => {
    await criarUsuario('aluno', 'doc-123', DADOS)
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: '12345678901@maragobus.app' })
    )
  })

  it('chama createUser com uid igual ao docId', async () => {
    await criarUsuario('aluno', 'doc-123', DADOS)
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'doc-123' })
    )
  })

  it('chama createUser com a senha fornecida', async () => {
    await criarUsuario('aluno', 'doc-123', DADOS)
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'senha123' })
    )
  })

  it('define custom claim perfil: "aluno"', async () => {
    await criarUsuario('aluno', 'doc-123', DADOS)
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('doc-123', { perfil: 'aluno' })
  })

  it('atualiza o documento na coleção "alunos"', async () => {
    await criarUsuario('aluno', 'doc-123', DADOS)
    expect(mockCollection).toHaveBeenCalledWith('alunos')
    expect(mockDoc).toHaveBeenCalledWith('doc-123')
  })

  it('marca primeiroAcesso: true no documento', async () => {
    await criarUsuario('aluno', 'doc-123', DADOS)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ primeiroAcesso: true })
    )
  })

  it('remove o campo senha do documento', async () => {
    await criarUsuario('aluno', 'doc-123', DADOS)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ senha: 'FIELD_DELETE' })
    )
  })

  it('define os custom claims com o uid retornado pelo Auth', async () => {
    mockCreateUser.mockImplementation(async () => ({ uid: 'uid-gerado' }))
    await criarUsuario('aluno', 'doc-123', DADOS)
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('uid-gerado', { perfil: 'aluno' })
  })
})

// ── criarUsuario — motorista ──────────────────────────────────────────────────

describe('criarUsuario — motorista', () => {
  const DADOS = { cpf: '98765432100', senha: 'abc456' }

  it('define custom claim perfil: "motorista"', async () => {
    await criarUsuario('motorista', 'doc-456', DADOS)
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('doc-456', { perfil: 'motorista' })
  })

  it('atualiza o documento na coleção "motoristas"', async () => {
    await criarUsuario('motorista', 'doc-456', DADOS)
    expect(mockCollection).toHaveBeenCalledWith('motoristas')
    expect(mockDoc).toHaveBeenCalledWith('doc-456')
  })

  it('chama createUser com email CPF@maragobus.app', async () => {
    await criarUsuario('motorista', 'doc-456', DADOS)
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: '98765432100@maragobus.app' })
    )
  })
})
