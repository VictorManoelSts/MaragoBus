/**
 * Handler agendado via Cloud Scheduler — roda no primeiro dia útil de cada ano.
 *
 * Responsabilidades:
 * - Buscar alunos com anoConclusao < anoAtual (já formados)
 * - Desativar cada um no Firebase Authentication (disabled: true)
 * - Atualizar o status no Firestore para 'concluindo' via batch
 *
 * Uso em Cloud Functions (Firebase Functions v2):
 *   export const expirarAcessoScheduled = onSchedule(
 *     { schedule: '0 0 2-8 1 1-5', timeZone: 'America/Maceio' },
 *     async () => { await expirarAcesso() }
 *   )
 *   // Cron '0 0 2-8 1 1-5': meia-noite, dias 2-8 de janeiro, seg–sex
 *   // Garante que caia no primeiro dia útil do ano
 */

import admin from 'firebase-admin'

export async function expirarAcesso(agora: Date = new Date()): Promise<void> {
  const app  = admin.apps[0] ?? admin.initializeApp()
  const auth = admin.auth(app)
  const db   = admin.firestore(app)

  const anoAtual = agora.getUTCFullYear()

  const alunosSnap = await db.collection('alunos')
    .where('anoConclusao', '<', anoAtual)
    .get()

  if (alunosSnap.empty) return

  await Promise.all(
    alunosSnap.docs.map((d) => auth.updateUser(d.id, { disabled: true }))
  )

  const batch = db.batch()
  alunosSnap.docs.forEach((d) => {
    batch.update(db.collection('alunos').doc(d.id), { status: 'concluindo' })
  })
  await batch.commit()
}
