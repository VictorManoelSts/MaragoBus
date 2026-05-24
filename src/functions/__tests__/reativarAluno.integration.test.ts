/**
 * @jest-environment node
 *
 * Testes de integração do handler reativarAluno contra o Firebase Emulator.
 *
 * Executar: FIREBASE_EMULATOR_HUB=1 EMULATOR_HOST=firebase npx jest reativarAluno.integration
 */

const describeIfEmulator = process.env.FIREBASE_EMULATOR_HUB ? describe : describe.skip

import { adminDb } from '@/services/firebaseAdminTest'
import { reativarAluno } from '@/functions/reativarAluno'

// ── Limpeza ───────────────────────────────────────────────────────────────────

const criadosDocs: Array<{ colecao: string; id: string }> = []

afterAll(async () => {
  await Promise.all(
    criadosDocs.map(({ colecao, id }) =>
      adminDb.collection(colecao).doc(id).delete().catch(() => {})
    )
  )
})

// ── Helpers ───────────────────────────────────────────────────────────────────

async function criarAlunoSuspenso(
  id: string,
  dataSuspensao: string,
  dataReativacao: string
): Promise<void> {
  await adminDb.collection('alunos').doc(id).set({
    nome:           `Aluno Reativação ${id}`,
    status:         'suspenso',
    dataSuspensao,
    dataReativacao,
  })
  criadosDocs.push({ colecao: 'alunos', id })
}

async function criarAdvertencia(id: string, alunoId: string): Promise<void> {
  await adminDb.collection('advertencias').doc(id).set({
    alunoId,
    motivo:      'Motivo restante',
    aplicadaPor: 'admin-1',
    tipo:        'direta',
    data:        new Date(),
  })
  // apagada pela função — não rastrear para limpeza manual
}

// ── Testes ────────────────────────────────────────────────────────────────────

describeIfEmulator('reativarAluno — integração: aluno vencido', () => {
  const ALUNO_ID = 'integ-reativ-001'
  // dataReativacao = ontem → deve ser reativado
  const AGORA = new Date('2025-02-10T00:00:00Z')

  beforeAll(async () => {
    await criarAlunoSuspenso(ALUNO_ID, '2025-02-05', '2025-02-09')
    await criarAdvertencia('integ-reativ-adv-001', ALUNO_ID)
    await reativarAluno(AGORA)

    // Rastrear punição criada para limpeza
    const snap = await adminDb.collection('punicoes').where('alunoId', '==', ALUNO_ID).get()
    snap.docs.forEach((d) => criadosDocs.push({ colecao: 'punicoes', id: d.id }))
  })

  it('atualiza status do aluno para ativo', async () => {
    const snap = await adminDb.collection('alunos').doc(ALUNO_ID).get()
    expect(snap.data()?.status).toBe('ativo')
  })

  it('zera dataSuspensao', async () => {
    const snap = await adminDb.collection('alunos').doc(ALUNO_ID).get()
    expect(snap.data()?.dataSuspensao).toBeNull()
  })

  it('zera dataReativacao', async () => {
    const snap = await adminDb.collection('alunos').doc(ALUNO_ID).get()
    expect(snap.data()?.dataReativacao).toBeNull()
  })

  it('cria registro de punição em punicoes', async () => {
    const snap = await adminDb.collection('punicoes').where('alunoId', '==', ALUNO_ID).get()
    expect(snap.docs.length).toBeGreaterThanOrEqual(1)
  })

  it('punição tem dataInicio correto', async () => {
    const snap = await adminDb.collection('punicoes').where('alunoId', '==', ALUNO_ID).get()
    expect(snap.docs[0].data().dataInicio).toBe('2025-02-05')
  })

  it('punição tem dataFim igual a hoje', async () => {
    const snap = await adminDb.collection('punicoes').where('alunoId', '==', ALUNO_ID).get()
    expect(snap.docs[0].data().dataFim).toBe('2025-02-10')
  })

  it('apaga advertências restantes do aluno', async () => {
    const snap = await adminDb.collection('advertencias').where('alunoId', '==', ALUNO_ID).get()
    expect(snap.docs).toHaveLength(0)
  })
})

describeIfEmulator('reativarAluno — integração: aluno não vencido', () => {
  const ALUNO_ID = 'integ-reativ-002'
  // dataReativacao = amanhã → não deve ser reativado
  const AGORA = new Date('2025-02-10T00:00:00Z')

  beforeAll(async () => {
    await criarAlunoSuspenso(ALUNO_ID, '2025-02-07', '2025-02-11')
    await reativarAluno(AGORA)
  })

  it('não reativa aluno cuja dataReativacao é amanhã', async () => {
    const snap = await adminDb.collection('alunos').doc(ALUNO_ID).get()
    expect(snap.data()?.status).toBe('suspenso')
  })

  it('não cria punição para aluno ainda suspenso', async () => {
    const snap = await adminDb.collection('punicoes').where('alunoId', '==', ALUNO_ID).get()
    expect(snap.docs).toHaveLength(0)
  })
})
