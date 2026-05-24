/**
 * @jest-environment node
 *
 * Testes de integração do handler criarUsuario contra o Firebase Emulator.
 *
 * Simula o disparo da Cloud Function ao criar documentos em /alunos e /motoristas:
 * o handler é chamado diretamente com os mesmos parâmetros que o trigger passaria.
 *
 * Executar: FIREBASE_EMULATOR_HUB=1 EMULATOR_HOST=firebase npx jest criarUsuario.integration
 */

const describeIfEmulator = process.env.FIREBASE_EMULATOR_HUB ? describe : describe.skip

import { adminAuth, adminDb } from '@/services/firebaseAdminTest'
import { criarUsuario } from '@/functions/criarUsuario'

// ── Limpeza ───────────────────────────────────────────────────────────────────

const criadosAuth: string[] = []
const criadosDocs: Array<{ colecao: string; id: string }> = []

afterAll(async () => {
  await Promise.all(criadosAuth.map((uid) => adminAuth.deleteUser(uid).catch(() => {})))
  await Promise.all(
    criadosDocs.map(({ colecao, id }) =>
      adminDb.collection(colecao).doc(id).delete().catch(() => {})
    )
  )
})

// ── Helpers ───────────────────────────────────────────────────────────────────

async function criarDocAluno(docId: string, cpf: string, senha: string): Promise<void> {
  await adminDb.collection('alunos').doc(docId).set({
    nome:                'Aluno Teste',
    cpf,
    senha,
    telefone:            '(82) 99999-0000',
    endereco:            'Rua Teste, 1',
    foto:                null,
    faculdade:           'UFAL',
    curso:               'Direito',
    modalidade:          'presencial',
    semestre:            3,
    anoConclusao:        2026,
    pontoEmbarquePadrao: 'Praça Central',
    status:              'ativo',
    dataSuspensao:       null,
    dataReativacao:      null,
    primeiroAcesso:      false,
  })
  criadosDocs.push({ colecao: 'alunos', id: docId })
}

async function criarDocMotorista(docId: string, cpf: string, senha: string): Promise<void> {
  await adminDb.collection('motoristas').doc(docId).set({
    nome:          'Motorista Teste',
    cpf,
    senha,
    telefone:      '(82) 88888-0000',
    primeiroAcesso: false,
  })
  criadosDocs.push({ colecao: 'motoristas', id: docId })
}

// ── Testes ────────────────────────────────────────────────────────────────────

describeIfEmulator('criarUsuario — integração (aluno)', () => {
  const DOC_ID = 'integ-aluno-001'
  const CPF    = '11100000001'
  const SENHA  = 'senha123'

  beforeAll(async () => {
    await criarDocAluno(DOC_ID, CPF, SENHA)
    criadosAuth.push(DOC_ID)
    await criarUsuario('aluno', DOC_ID, { cpf: CPF, senha: SENHA })
  })

  it('cria o usuário no Firebase Auth', async () => {
    const user = await adminAuth.getUser(DOC_ID)
    expect(user).toBeDefined()
  })

  it('email do usuário é CPF@maragobus.app', async () => {
    const user = await adminAuth.getUser(DOC_ID)
    expect(user.email).toBe(`${CPF}@maragobus.app`)
  })

  it('uid do usuário Auth é igual ao docId', async () => {
    const user = await adminAuth.getUser(DOC_ID)
    expect(user.uid).toBe(DOC_ID)
  })

  it('custom claim perfil é "aluno"', async () => {
    const user = await adminAuth.getUser(DOC_ID)
    expect(user.customClaims?.perfil).toBe('aluno')
  })

  it('primeiroAcesso marcado como true no documento', async () => {
    const snap = await adminDb.collection('alunos').doc(DOC_ID).get()
    expect(snap.data()?.primeiroAcesso).toBe(true)
  })

  it('campo senha removido do documento', async () => {
    const snap = await adminDb.collection('alunos').doc(DOC_ID).get()
    expect(snap.data()?.senha).toBeUndefined()
  })
})

describeIfEmulator('criarUsuario — integração (motorista)', () => {
  const DOC_ID = 'integ-motorista-001'
  const CPF    = '22200000001'
  const SENHA  = 'senha456'

  beforeAll(async () => {
    await criarDocMotorista(DOC_ID, CPF, SENHA)
    criadosAuth.push(DOC_ID)
    await criarUsuario('motorista', DOC_ID, { cpf: CPF, senha: SENHA })
  })

  it('cria o usuário no Firebase Auth', async () => {
    const user = await adminAuth.getUser(DOC_ID)
    expect(user).toBeDefined()
  })

  it('email do usuário é CPF@maragobus.app', async () => {
    const user = await adminAuth.getUser(DOC_ID)
    expect(user.email).toBe(`${CPF}@maragobus.app`)
  })

  it('custom claim perfil é "motorista"', async () => {
    const user = await adminAuth.getUser(DOC_ID)
    expect(user.customClaims?.perfil).toBe('motorista')
  })

  it('primeiroAcesso marcado como true no documento', async () => {
    const snap = await adminDb.collection('motoristas').doc(DOC_ID).get()
    expect(snap.data()?.primeiroAcesso).toBe(true)
  })

  it('campo senha removido do documento', async () => {
    const snap = await adminDb.collection('motoristas').doc(DOC_ID).get()
    expect(snap.data()?.senha).toBeUndefined()
  })
})
