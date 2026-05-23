import {
  collection, query, where, getDocs,
  doc, getDoc, updateDoc, writeBatch,
  orderBy,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { StatusAluno } from '@/types/aluno'
import { TipoAdvertencia } from '@/types/advertencia'
import type { Aluno } from '@/types/aluno'
import type { Advertencia } from '@/types/advertencia'

export type CamposEditaveis = Pick<Aluno,
  'nome' | 'telefone' | 'endereco' | 'faculdade' | 'curso' |
  'modalidade' | 'semestre' | 'anoConclusao' | 'pontoEmbarquePadrao'
>

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

// ── buscarDetalheAluno ────────────────────────────────────────────────────────

async function buscarDetalheAluno(
  alunoId: string
): Promise<{ aluno: Aluno; advertencias: Advertencia[] }> {
  const alunoDoc = await getDoc(doc(db, 'alunos', alunoId))
  if (!alunoDoc.exists()) throw new Error('Aluno não encontrado.')

  const aluno: Aluno = { id: alunoDoc.id, ...(alunoDoc.data() as Omit<Aluno, 'id'>) }

  const advSnap = await getDocs(
    query(
      collection(db, 'advertencias'),
      where('alunoId', '==', alunoId),
      orderBy('data', 'asc'),
    )
  )
  const advertencias: Advertencia[] = advSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as Advertencia)
  )

  return { aluno, advertencias }
}

// ── suspenderAluno ────────────────────────────────────────────────────────────

function calcularDataReativacao(dataInicio: Date, diasUteis: number): string {
  const data = new Date(dataInicio)
  let contados = 0
  while (contados < diasUteis) {
    data.setDate(data.getDate() + 1)
    const diaSemana = data.getDay()
    if (diaSemana !== 0 && diaSemana !== 6) contados++
  }
  return data.toISOString().split('T')[0]
}

async function suspenderAluno(alunoId: string, agora: Date = new Date()): Promise<void> {
  const dataSuspensao = agora.toISOString().split('T')[0]
  const dataReativacao = calcularDataReativacao(agora, 3)
  await updateDoc(doc(db, 'alunos', alunoId), {
    status: StatusAluno.Suspenso,
    dataSuspensao,
    dataReativacao,
  })
}

// ── excluirAluno ──────────────────────────────────────────────────────────────

async function excluirAluno(alunoId: string): Promise<void> {
  const batch = writeBatch(db)

  const colecoes = ['advertencias', 'reservas', 'punicoes']
  for (const col of colecoes) {
    const snap = await getDocs(
      query(collection(db, col), where('alunoId', '==', alunoId))
    )
    snap.docs.forEach((d) => batch.delete(d.ref))
  }

  batch.delete(doc(db, 'alunos', alunoId))
  await batch.commit()
}

// ── editarAluno ───────────────────────────────────────────────────────────────

async function editarAluno(alunoId: string, dados: Partial<CamposEditaveis>): Promise<void> {
  if (Object.keys(dados).length === 0) return
  await updateDoc(doc(db, 'alunos', alunoId), dados)
}

export const adminService = {
  buscarReservasDia,
  buscarDetalheAluno,
  suspenderAluno,
  excluirAluno,
  editarAluno,
}

// manter compatibilidade com importações existentes do TipoAdvertencia
export { TipoAdvertencia }
