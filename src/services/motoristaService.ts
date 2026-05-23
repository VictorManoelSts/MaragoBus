import { collection, query, where, getDocs, doc, getDoc, addDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { BUSINESS } from '@/constants/business'
import { StatusSolicitacao } from '@/types/advertencia'
import type { Aluno } from '@/types/aluno'

export const MOTORISTA_ERROS = {
  LISTA_DIA_SEGUINTE_INDISPONIVEL: 'motorista/lista-dia-seguinte-indisponivel',
} as const

type MotoristaErro = (typeof MOTORISTA_ERROS)[keyof typeof MOTORISTA_ERROS]

export interface AlunoComReserva {
  reservaId: string
  aluno: Aluno
  pontoEscolhido: string
}

export interface FiltrosMotorista {
  faculdade?: string
  pontoEmbarque?: string
}

function erro(code: MotoristaErro, message: string): Error {
  return Object.assign(new Error(message), { code })
}

function toDataLocal(data: Date): string {
  const y = data.getFullYear()
  const m = String(data.getMonth() + 1).padStart(2, '0')
  const d = String(data.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function diaSeguinteLocal(agora: Date): string {
  const amanha = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1)
  return toDataLocal(amanha)
}

async function buscarPorData(
  data: string,
  filtros?: FiltrosMotorista
): Promise<AlunoComReserva[]> {
  const snap = await getDocs(
    query(collection(db, 'reservas'), where('data', '==', data))
  )

  if (snap.empty) return []

  type ReservaRaw = { id: string; alunoId: string; pontoEscolhido: string }

  let reservas: ReservaRaw[] = snap.docs.map((d) => ({
    id: d.id,
    alunoId: d.data()['alunoId'] as string,
    pontoEscolhido: d.data()['pontoEscolhido'] as string,
  }))

  // Filtra por ponto antes de buscar os alunos (evita leituras desnecessárias)
  if (filtros?.pontoEmbarque) {
    reservas = reservas.filter((r) => r.pontoEscolhido === filtros.pontoEmbarque)
  }

  if (reservas.length === 0) return []

  const alunosDocs = await Promise.all(
    reservas.map((r) => getDoc(doc(db, 'alunos', r.alunoId)))
  )

  const resultado: AlunoComReserva[] = []

  for (let i = 0; i < reservas.length; i++) {
    const reserva = reservas[i]
    const alunoDoc = alunosDocs[i]

    if (!alunoDoc.exists()) continue

    const aluno: Aluno = { id: alunoDoc.id, ...(alunoDoc.data() as Omit<Aluno, 'id'>) }

    if (filtros?.faculdade && aluno.faculdade !== filtros.faculdade) continue

    resultado.push({ reservaId: reserva.id, aluno, pontoEscolhido: reserva.pontoEscolhido })
  }

  return resultado
}

async function buscarAlunosHoje(
  agora: Date,
  filtros?: FiltrosMotorista
): Promise<AlunoComReserva[]> {
  return buscarPorData(toDataLocal(agora), filtros)
}

async function buscarAlunosDiaSeguinte(
  agora: Date,
  filtros?: FiltrosMotorista
): Promise<AlunoComReserva[]> {
  if (agora.getHours() < BUSINESS.motorista.diaSeguinteHora) {
    throw erro(
      MOTORISTA_ERROS.LISTA_DIA_SEGUINTE_INDISPONIVEL,
      `A lista do dia seguinte só está disponível a partir das ${BUSINESS.motorista.diaSeguinteHora}h.`
    )
  }

  return buscarPorData(diaSeguinteLocal(agora), filtros)
}

async function solicitarAdvertencia(alunoId: string, motivo: string): Promise<void> {
  const motoristaId = auth.currentUser?.uid
  if (!motoristaId) throw new Error('Não autenticado')
  await addDoc(collection(db, 'solicitacoes'), {
    alunoId,
    motoristaId,
    motivo,
    status: StatusSolicitacao.Pendente,
    data: new Date(),
  })
}

export const motoristaService = { buscarAlunosHoje, buscarAlunosDiaSeguinte, solicitarAdvertencia }
