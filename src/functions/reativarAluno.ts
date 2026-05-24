/**
 * Handler agendado via Cloud Scheduler — roda diariamente às 0h.
 *
 * Responsabilidades:
 * - Buscar alunos com status 'suspenso' e dataReativacao <= hoje
 * - Para cada aluno, via batch atômico:
 *     - Registrar punição em /punicoes (histórico do admin)
 *     - Atualizar status para 'ativo', zerar dataSuspensao e dataReativacao
 *     - Apagar advertências restantes (zerando o contador)
 *
 * Uso em Cloud Functions (Firebase Functions v2):
 *   export const reativarAlunosScheduled = onSchedule(
 *     { schedule: '0 0 * * *', timeZone: 'America/Maceio' },
 *     async () => { await reativarAluno() }
 *   )
 */

import admin from 'firebase-admin'

export async function reativarAluno(agora: Date = new Date()): Promise<void> {
  const app = admin.apps[0] ?? admin.initializeApp()
  const db  = admin.firestore(app)

  const hojeStr = agora.toISOString().split('T')[0]

  const alunosSnap = await db.collection('alunos')
    .where('status', '==', 'suspenso')
    .where('dataReativacao', '<=', hojeStr)
    .get()

  if (alunosSnap.empty) return

  const batch = db.batch()

  for (const alunoDoc of alunosSnap.docs) {
    const alunoId = alunoDoc.id
    const dados   = alunoDoc.data() as { dataSuspensao: string }

    const punicaoRef = db.collection('punicoes').doc()
    batch.set(punicaoRef, {
      alunoId,
      motivos:         [],
      explicacaoAdmin: 'Suspensão automática',
      dataInicio:      dados.dataSuspensao,
      dataFim:         hojeStr,
    })

    batch.update(db.collection('alunos').doc(alunoId), {
      status:         'ativo',
      dataSuspensao:  null,
      dataReativacao: null,
    })

    const advSnap = await db.collection('advertencias')
      .where('alunoId', '==', alunoId)
      .get()
    advSnap.docs.forEach((d) => batch.delete(d.ref))
  }

  await batch.commit()
}
