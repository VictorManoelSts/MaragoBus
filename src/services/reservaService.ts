import {
  collection,
  doc,
  addDoc,
  getDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { janelaAberta, cancelamentoPermitido } from '@/utils/janelareserva'
import { StatusAluno } from '@/types/aluno'
import type { Reserva } from '@/types/reserva'

export const RESERVA_ERROS = {
  JANELA_FECHADA: 'reserva/janela-fechada',
  ALUNO_SUSPENSO: 'reserva/aluno-suspenso',
  CANCELAMENTO_EXPIRADO: 'reserva/cancelamento-expirado',
  RESERVA_NAO_ENCONTRADA: 'reserva/nao-encontrada',
  RESERVA_NAO_PERTENCE_AO_ALUNO: 'reserva/nao-pertence-ao-aluno',
} as const

type ReservaErro = (typeof RESERVA_ERROS)[keyof typeof RESERVA_ERROS]

function erro(code: ReservaErro, message: string): Error {
  return Object.assign(new Error(message), { code })
}

async function criarReserva(
  alunoId: string,
  pontoEscolhido: string,
  data: string,
  agora: Date
): Promise<Reserva> {
  if (!janelaAberta(agora)) {
    throw erro(RESERVA_ERROS.JANELA_FECHADA, 'A janela de reservas está fechada.')
  }

  const alunoSnap = await getDoc(doc(db, 'alunos', alunoId))

  if (!alunoSnap.exists()) {
    throw new Error('Aluno não encontrado.')
  }

  const alunoData = alunoSnap.data() as { status: string }

  if (alunoData.status === StatusAluno.Suspenso) {
    throw erro(RESERVA_ERROS.ALUNO_SUSPENSO, 'Aluno suspenso não pode fazer reservas.')
  }

  const docRef = await addDoc(collection(db, 'reservas'), {
    alunoId,
    pontoEscolhido,
    data,
    criadaEm: serverTimestamp(),
  })

  return {
    id: docRef.id,
    alunoId,
    pontoEscolhido,
    data,
    criadaEm: Timestamp.now(),
  }
}

async function cancelarReserva(
  reservaId: string,
  alunoId: string,
  agora: Date
): Promise<void> {
  if (!cancelamentoPermitido(agora)) {
    throw erro(RESERVA_ERROS.CANCELAMENTO_EXPIRADO, 'O prazo para cancelamento expirou.')
  }

  const reservaSnap = await getDoc(doc(db, 'reservas', reservaId))

  if (!reservaSnap.exists()) {
    throw erro(RESERVA_ERROS.RESERVA_NAO_ENCONTRADA, 'Reserva não encontrada.')
  }

  const reservaData = reservaSnap.data() as { alunoId: string }

  if (reservaData.alunoId !== alunoId) {
    throw erro(RESERVA_ERROS.RESERVA_NAO_PERTENCE_AO_ALUNO, 'Esta reserva não pertence ao aluno.')
  }

  await deleteDoc(doc(db, 'reservas', reservaId))
}

async function buscarReservaAtiva(
  alunoId: string,
  data: string
): Promise<Reserva | null> {
  const q = query(
    collection(db, 'reservas'),
    where('alunoId', '==', alunoId),
    where('data', '==', data)
  )

  const snap = await getDocs(q)

  if (snap.empty) return null

  const docSnap = snap.docs[0]
  const d = docSnap.data()

  return {
    id: docSnap.id,
    alunoId: d['alunoId'] as string,
    pontoEscolhido: d['pontoEscolhido'] as string,
    data: d['data'] as string,
    criadaEm: d['criadaEm'] as Timestamp,
  }
}

export const reservaService = { criarReserva, cancelarReserva, buscarReservaAtiva }
