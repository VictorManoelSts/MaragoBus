import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Aluno } from '@/types/aluno'

export interface ReservaAdmin {
  reservaId: string
  aluno: Aluno
  pontoEscolhido: string
}

async function buscarReservasDia(data: string): Promise<ReservaAdmin[]> {
  const snap = await getDocs(
    query(collection(db, 'reservas'), where('data', '==', data))
  )
  if (snap.empty) return []

  type ReservaRaw = { id: string; alunoId: string; pontoEscolhido: string }
  const reservas: ReservaRaw[] = snap.docs.map((d) => ({
    id: d.id,
    alunoId: d.data()['alunoId'] as string,
    pontoEscolhido: d.data()['pontoEscolhido'] as string,
  }))

  const alunosDocs = await Promise.all(
    reservas.map((r) => getDoc(doc(db, 'alunos', r.alunoId)))
  )

  const resultado: ReservaAdmin[] = []
  for (let i = 0; i < reservas.length; i++) {
    const reserva = reservas[i]
    const alunoDoc = alunosDocs[i]
    if (!alunoDoc.exists()) continue
    const aluno: Aluno = { id: alunoDoc.id, ...(alunoDoc.data() as Omit<Aluno, 'id'>) }
    resultado.push({ reservaId: reserva.id, aluno, pontoEscolhido: reserva.pontoEscolhido })
  }

  return resultado
}

export const adminService = { buscarReservasDia }
