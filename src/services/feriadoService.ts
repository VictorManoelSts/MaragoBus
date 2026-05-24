import {
  collection, query, where, orderBy,
  getDocs, addDoc, doc, deleteDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { BUSINESS } from '@/constants/business'
import { TipoFeriado } from '@/types/feriado'
import type { Feriado } from '@/types/feriado'

interface BrasilAPIFeriado {
  date: string
  name: string
  type: string
}

async function buscarFeriadosNacionaisBrasil(ano: number): Promise<Feriado[]> {
  const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`)
  if (!res.ok) throw new Error('BrasilAPI indisponível')
  const dados: BrasilAPIFeriado[] = await res.json()
  return dados.map(f => ({
    id: `brasil-${f.date}`,
    data: f.date,
    nome: f.name,
    tipo: TipoFeriado.Nacional,
  }))
}

async function buscarFeriados(ano: number): Promise<Feriado[]> {
  const snap = await getDocs(
    query(
      collection(db, 'feriados'),
      where('data', '>=', `${ano}-01-01`),
      where('data', '<=', `${ano}-12-31`),
      orderBy('data', 'asc'),
    )
  )
  return snap.docs.map(d => ({
    id: d.id,
    ...(d.data() as Omit<Feriado, 'id'>),
  }))
}

async function adicionarFeriado(data: string, nome: string, tipo: TipoFeriado): Promise<string> {
  const ref = await addDoc(collection(db, 'feriados'), { data, nome, tipo })
  return ref.id
}

async function removerFeriado(id: string): Promise<void> {
  await deleteDoc(doc(db, 'feriados', id))
}

async function sincronizarNacionais(ano: number): Promise<void> {
  const [brasil, armazenados] = await Promise.all([
    buscarFeriadosNacionaisBrasil(ano),
    buscarFeriados(ano),
  ])
  const datasNacionaisExistentes = new Set(
    armazenados.filter(f => f.tipo === TipoFeriado.Nacional).map(f => f.data)
  )
  const faltando = brasil.filter(f => !datasNacionaisExistentes.has(f.data))
  await Promise.all(faltando.map(f => adicionarFeriado(f.data, f.nome, TipoFeriado.Nacional)))
}

function verificarAvisos(feriados: Feriado[], agora: Date): Feriado[] {
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
  const diasAviso = BUSINESS.notificacoes.avisoFeriadoDias as readonly number[]
  return feriados.filter(f => {
    const dataFeriado = new Date(f.data + 'T00:00:00')
    const diffMs = dataFeriado.getTime() - hoje.getTime()
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24))
    return diasAviso.includes(diffDias)
  })
}

export const feriadoService = {
  buscarFeriadosNacionaisBrasil,
  buscarFeriados,
  adicionarFeriado,
  removerFeriado,
  sincronizarNacionais,
  verificarAvisos,
}
