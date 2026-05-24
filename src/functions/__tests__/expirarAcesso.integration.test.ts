/**
 * @jest-environment node
 *
 * Testes de integração do handler expirarAcesso contra o Firebase Emulator.
 *
 * Executar: FIREBASE_EMULATOR_HUB=1 EMULATOR_HOST=firebase npx jest expirarAcesso.integration
 */

const describeIfEmulator = process.env.FIREBASE_EMULATOR_HUB ? describe : describe.skip

import { adminAuth, adminDb } from '@/services/firebaseAdminTest'
import { expirarAcesso } from '@/functions/expirarAcesso'

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

async function criarAluno(id: string, cpf: string, anoConclusao: number): Promise<void> {
  await adminAuth.createUser({ uid: id, email: `${cpf}@maragobus.app`, password: 'senha123' })
  criadosAuth.push(id)
  await adminDb.collection('alunos').doc(id).set({ anoConclusao, status: 'ativo' })
  criadosDocs.push({ colecao: 'alunos', id })
}

// ── Testes ────────────────────────────────────────────────────────────────────

describeIfEmulator('expirarAcesso — integração: aluno vencido', () => {
  const ALUNO_ID = 'integ-expirar-001'
  // anoConclusao < 2025 → deve ser desativado
  const AGORA = new Date('2025-01-06T00:00:00Z')

  beforeAll(async () => {
    await criarAluno(ALUNO_ID, '33300000001', 2024)
    await expirarAcesso(AGORA)
  })

  it('desativa o usuário no Firebase Auth', async () => {
    const user = await adminAuth.getUser(ALUNO_ID)
    expect(user.disabled).toBe(true)
  })

  it('atualiza status do aluno para concluindo no Firestore', async () => {
    const snap = await adminDb.collection('alunos').doc(ALUNO_ID).get()
    expect(snap.data()?.status).toBe('concluindo')
  })
})

describeIfEmulator('expirarAcesso — integração: aluno do ano atual', () => {
  const ALUNO_ID = 'integ-expirar-002'
  // anoConclusao == 2025 → NÃO deve ser desativado
  const AGORA = new Date('2025-01-06T00:00:00Z')

  beforeAll(async () => {
    await criarAluno(ALUNO_ID, '44400000001', 2025)
    await expirarAcesso(AGORA)
  })

  it('não desativa usuário cujo anoConclusao é o ano atual', async () => {
    const user = await adminAuth.getUser(ALUNO_ID)
    expect(user.disabled).toBe(false)
  })

  it('não altera o status no Firestore', async () => {
    const snap = await adminDb.collection('alunos').doc(ALUNO_ID).get()
    expect(snap.data()?.status).toBe('ativo')
  })
})

describeIfEmulator('expirarAcesso — integração: múltiplos alunos', () => {
  const IDS = ['integ-expirar-003', 'integ-expirar-004']
  const AGORA = new Date('2026-01-05T00:00:00Z')

  beforeAll(async () => {
    await criarAluno(IDS[0], '55500000001', 2024)
    await criarAluno(IDS[1], '66600000001', 2025)
    await expirarAcesso(AGORA)
  })

  it('desativa todos os alunos vencidos', async () => {
    const user0 = await adminAuth.getUser(IDS[0])
    const user1 = await adminAuth.getUser(IDS[1])
    expect(user0.disabled).toBe(true)
    expect(user1.disabled).toBe(true)
  })

  it('atualiza status de todos os vencidos para concluindo', async () => {
    const snap0 = await adminDb.collection('alunos').doc(IDS[0]).get()
    const snap1 = await adminDb.collection('alunos').doc(IDS[1]).get()
    expect(snap0.data()?.status).toBe('concluindo')
    expect(snap1.data()?.status).toBe('concluindo')
  })
})
