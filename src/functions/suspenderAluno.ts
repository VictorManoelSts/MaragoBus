/**
 * Handler disparado ao confirmar a 3ª advertência de um aluno.
 *
 * Responsabilidades:
 * - Buscar as advertências do aluno no Firestore
 * - Calcular dataSuspensao e dataReativacao (3 dias úteis, ignorando fins de
 *   semana e feriados cadastrados no Firestore)
 * - Atualizar o aluno para status "suspenso" via batch
 * - Criar notificação com resumo dos motivos via batch
 * - Apagar as advertências via batch (aluno começa zerado após cumprir suspensão)
 *
 * Uso em Cloud Functions (Firebase Functions v2):
 *   onDocumentUpdated('advertencias/{docId}', async (event) => {
 *     const depois = event.data?.after?.data()
 *     if (depois?.status !== 'confirmada') return
 *     const alunoId = depois.alunoId
 *     const snap = await adminDb.collection('advertencias')
 *       .where('alunoId', '==', alunoId).get()
 *     if (snap.size >= BUSINESS.suspensao.advertenciasParaSuspender) {
 *       await suspenderAluno(alunoId)
 *     }
 *   })
 */

import admin from 'firebase-admin'
import { BUSINESS } from '@/constants/business'
import { TipoNotificacao } from '@/types/notificacao'

async function calcularDataReativacao(
  db: ReturnType<typeof admin.firestore>,
  dataInicio: Date,
  diasUteis: number
): Promise<string> {
  const inicioStr  = dataInicio.toISOString().split('T')[0]
  const fimJanela  = new Date(dataInicio)
  fimJanela.setDate(fimJanela.getDate() + diasUteis * 4 + 10)
  const fimStr = fimJanela.toISOString().split('T')[0]

  const feriadosSnap = await db.collection('feriados')
    .where('data', '>=', inicioStr)
    .where('data', '<=', fimStr)
    .get()

  const feriados = new Set(
    feriadosSnap.docs.map((d) => (d.data() as { data: string }).data)
  )

  const data = new Date(dataInicio)
  let contados = 0
  while (contados < diasUteis) {
    data.setDate(data.getDate() + 1)
    const dia    = data.getDay()
    const dataStr = data.toISOString().split('T')[0]
    if (dia !== 0 && dia !== 6 && !feriados.has(dataStr)) {
      contados++
    }
  }

  return data.toISOString().split('T')[0]
}

export async function suspenderAluno(
  alunoId: string,
  agora: Date = new Date()
): Promise<void> {
  const app = admin.apps[0] ?? admin.initializeApp()
  const db  = admin.firestore(app)

  const advSnap = await db.collection('advertencias')
    .where('alunoId', '==', alunoId)
    .get()

  const motivos = advSnap.docs.map((d) => (d.data() as { motivo: string }).motivo)

  const dataSuspensao  = agora.toISOString().split('T')[0]
  const dataReativacao = await calcularDataReativacao(
    db,
    agora,
    BUSINESS.suspensao.diasUteisAfastamento
  )

  const batch = db.batch()

  batch.update(db.collection('alunos').doc(alunoId), {
    status: 'suspenso',
    dataSuspensao,
    dataReativacao,
  })

  const notifRef = db.collection('notificacoes').doc()
  batch.set(notifRef, {
    alunoId,
    tipo:      TipoNotificacao.SuspensaoConfirmada,
    titulo:    'Acesso suspenso',
    mensagem:  `Seu acesso foi suspenso por ${BUSINESS.suspensao.diasUteisAfastamento} dias úteis. Motivos: ${motivos.join('; ')}.`,
    lida:      false,
    criadaEm:  admin.firestore.FieldValue.serverTimestamp(),
  })

  advSnap.docs.forEach((d) => batch.delete(d.ref))

  await batch.commit()
}
