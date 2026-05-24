/**
 * @jest-environment node
 *
 * Testes de integração do handler suspenderAluno contra o Firebase Emulator.
 *
 * Executar: FIREBASE_EMULATOR_HUB=1 EMULATOR_HOST=firebase npx jest suspenderAluno.integration
 */

const describeIfEmulator = process.env.FIREBASE_EMULATOR_HUB ? describe : describe.skip

import { adminDb } from '@/services/firebaseAdminTest'
import { suspenderAluno } from '@/functions/suspenderAluno'

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

async function criarAluno(id: string): Promise<void> {
  await adminDb.collection('alunos').doc(id).set({
    nome:            'Aluno Teste Suspensão',
    status:          'ativo',
    dataSuspensao:   null,
    dataReativacao:  null,
  })
  criadosDocs.push({ colecao: 'alunos', id })
}

async function criarAdvertencia(id: string, alunoId: string, motivo: string): Promise<void> {
  await adminDb.collection('advertencias').doc(id).set({
    alunoId,
    motivo,
    aplicadaPor: 'admin-1',
    tipo:        'solicitacao',
    data:        new Date(),
  })
  // Advertências são apagadas pela função — não rastrear para limpeza manual
}

// ── Testes ────────────────────────────────────────────────────────────────────

describeIfEmulator('suspenderAluno — integração', () => {
  const ALUNO_ID = 'integ-suspend-001'
  const ADV_IDS  = ['integ-adv-s-001', 'integ-adv-s-002', 'integ-adv-s-003']
  const MOTIVOS  = ['Atraso na parada', 'Saída antecipada', 'Reclamação do motorista']

  // Quarta-feira: 3 dias úteis = segunda-feira 2025-01-06
  const AGORA = new Date('2025-01-01T12:00:00')

  beforeAll(async () => {
    await criarAluno(ALUNO_ID)
    for (let i = 0; i < 3; i++) {
      await criarAdvertencia(ADV_IDS[i], ALUNO_ID, MOTIVOS[i])
    }

    await suspenderAluno(ALUNO_ID, AGORA)

    // Rastrear notificações criadas pela função para limpeza
    const notifSnap = await adminDb.collection('notificacoes')
      .where('alunoId', '==', ALUNO_ID)
      .get()
    notifSnap.docs.forEach((d) => criadosDocs.push({ colecao: 'notificacoes', id: d.id }))
  })

  // ── Aluno ──────────────────────────────────────────────────────────────────

  it('atualiza status do aluno para suspenso', async () => {
    const snap = await adminDb.collection('alunos').doc(ALUNO_ID).get()
    expect(snap.data()?.status).toBe('suspenso')
  })

  it('salva dataSuspensao no formato YYYY-MM-DD', async () => {
    const snap = await adminDb.collection('alunos').doc(ALUNO_ID).get()
    expect(snap.data()?.dataSuspensao).toBe('2025-01-01')
  })

  it('calcula dataReativacao com 3 dias úteis pulando fim de semana', async () => {
    const snap = await adminDb.collection('alunos').doc(ALUNO_ID).get()
    expect(snap.data()?.dataReativacao).toBe('2025-01-06')
  })

  // ── Notificação ────────────────────────────────────────────────────────────

  it('cria ao menos uma notificação para o aluno', async () => {
    const snap = await adminDb.collection('notificacoes')
      .where('alunoId', '==', ALUNO_ID)
      .get()
    expect(snap.docs.length).toBeGreaterThanOrEqual(1)
  })

  it('notificação tem tipo suspensao_confirmada', async () => {
    const snap = await adminDb.collection('notificacoes')
      .where('alunoId', '==', ALUNO_ID)
      .get()
    expect(snap.docs[0].data().tipo).toBe('suspensao_confirmada')
  })

  it('notificação tem lida: false', async () => {
    const snap = await adminDb.collection('notificacoes')
      .where('alunoId', '==', ALUNO_ID)
      .get()
    expect(snap.docs[0].data().lida).toBe(false)
  })

  it('notificação menciona os motivos das advertências', async () => {
    const snap = await adminDb.collection('notificacoes')
      .where('alunoId', '==', ALUNO_ID)
      .get()
    const mensagem = snap.docs[0].data().mensagem as string
    expect(mensagem).toContain('Atraso na parada')
    expect(mensagem).toContain('Saída antecipada')
    expect(mensagem).toContain('Reclamação do motorista')
  })

  // ── Advertências ───────────────────────────────────────────────────────────

  it('apaga todas as advertências do aluno', async () => {
    const snap = await adminDb.collection('advertencias')
      .where('alunoId', '==', ALUNO_ID)
      .get()
    expect(snap.docs).toHaveLength(0)
  })
})
