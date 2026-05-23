import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { StatusAluno } from '@/types/aluno'
import type { Aluno } from '@/types/aluno'

async function buscarAlunos(): Promise<Aluno[]> {
  const snap = await getDocs(collection(db, 'alunos'))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Aluno, 'id'>) }))
}

async function reativarAluno(alunoId: string): Promise<void> {
  await updateDoc(doc(db, 'alunos', alunoId), {
    status: StatusAluno.Ativo,
    dataSuspensao: null,
    dataReativacao: null,
  })
}

export const alunoService = { buscarAlunos, reativarAluno }
