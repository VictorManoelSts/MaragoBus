/**
 * Handler disparado ao criar um novo documento em /alunos ou /motoristas.
 *
 * Responsabilidades:
 * - Criar o usuário no Firebase Authentication (CPF como email, uid = docId)
 * - Definir o custom claim de perfil (aluno | motorista)
 * - Marcar primeiroAcesso: true e remover a senha do documento
 *
 * Uso em Cloud Functions (Firebase Functions v2):
 *   onDocumentCreated('{colecao}/{docId}', async (event) => {
 *     const colecao = event.params.colecao as 'alunos' | 'motoristas'
 *     if (!['alunos', 'motoristas'].includes(colecao)) return
 *     const dados = event.data?.data()
 *     if (!dados?.cpf || !dados?.senha) return
 *     const perfil = colecao === 'alunos' ? 'aluno' : 'motorista'
 *     await criarUsuario(perfil, event.params.docId, dados)
 *   })
 */

import admin from 'firebase-admin'

export type Perfil = 'aluno' | 'motorista'

export async function criarUsuario(
  perfil: Perfil,
  docId: string,
  dados: { cpf: string; senha: string }
): Promise<void> {
  const app = admin.apps[0] ?? admin.initializeApp()
  const auth = admin.auth(app)
  const db   = admin.firestore(app)
  const colecao = perfil === 'aluno' ? 'alunos' : 'motoristas'

  const userRecord = await auth.createUser({
    uid:      docId,
    email:    `${dados.cpf}@maragobus.app`,
    password: dados.senha,
  })

  await auth.setCustomUserClaims(userRecord.uid, { perfil })

  await db.collection(colecao).doc(docId).update({
    primeiroAcesso: true,
    senha: admin.firestore.FieldValue.delete(),
  })
}
