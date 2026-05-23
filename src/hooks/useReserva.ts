import { useState, useEffect } from 'react'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { reservaService } from '@/services/reservaService'
import { janelaAberta, cancelamentoPermitido, proximoDiaUtil } from '@/utils/janelareserva'
import { BUSINESS } from '@/constants/business'
import type { Aluno } from '@/types/aluno'
import type { Ponto } from '@/types/ponto'
import type { Reserva } from '@/types/reserva'

export interface UseReservaReturn {
  aluno: Aluno | null
  pontos: Ponto[]
  reservaAtiva: Reserva | null
  pontoSelecionado: string
  carregando: boolean
  enviando: boolean
  erro: string | null
  dataDaViagem: string | null
  janelaEstaAberta: boolean
  cancelamentoEstaPermitido: boolean
  confirmarReserva: () => Promise<void>
  cancelarReserva: () => Promise<void>
  selecionarPonto: (ponto: string) => void
}

function calcularDataViagem(agora: Date): string {
  const hora = agora.getHours()
  const base = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
  if (hora >= BUSINESS.reserva.aberturaHora) {
    base.setDate(base.getDate() + 1)
  }
  const diaUtil = proximoDiaUtil(base, [])
  const y = diaUtil.getFullYear()
  const m = String(diaUtil.getMonth() + 1).padStart(2, '0')
  const d = String(diaUtil.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function useReserva(agora: Date = new Date()): UseReservaReturn {
  const [aluno, setAluno] = useState<Aluno | null>(null)
  const [pontos, setPontos] = useState<Ponto[]>([])
  const [reservaAtiva, setReservaAtiva] = useState<Reserva | null>(null)
  const [pontoSelecionado, setPontoSelecionado] = useState<string>('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [dataDaViagem] = useState<string>(() => calcularDataViagem(agora))

  const uid = auth.currentUser?.uid ?? null

  useEffect(() => {
    if (!uid) {
      setCarregando(false)
      return
    }

    async function carregar() {
      const [alunoSnap, pontosSnap, reserva] = await Promise.all([
        getDoc(doc(db, 'alunos', uid!)),
        getDocs(query(collection(db, 'pontos'), where('ativo', '==', true))),
        reservaService.buscarReservaAtiva(uid!, dataDaViagem),
      ])

      if (alunoSnap.exists()) {
        const dados = alunoSnap.data() as Omit<Aluno, 'id'>
        setAluno({ id: uid!, ...dados })
        setPontoSelecionado(dados.pontoEmbarquePadrao ?? '')
      }

      setPontos(
        pontosSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Ponto, 'id'>) }))
      )
      setReservaAtiva(reserva)
      setCarregando(false)
    }

    carregar().catch(() => setCarregando(false))
  }, [uid, dataDaViagem])

  const janelaEstaAberta = janelaAberta(agora)
  const cancelamentoEstaPermitido = !!reservaAtiva && cancelamentoPermitido(agora)

  async function confirmarReserva() {
    if (!uid) return
    setEnviando(true)
    setErro(null)
    try {
      const novaReserva = await reservaService.criarReserva(uid, pontoSelecionado, dataDaViagem, agora)
      setReservaAtiva(novaReserva)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao confirmar reserva.')
    } finally {
      setEnviando(false)
    }
  }

  async function cancelarReserva() {
    if (!uid || !reservaAtiva) return
    setEnviando(true)
    setErro(null)
    try {
      await reservaService.cancelarReserva(reservaAtiva.id, uid, agora)
      setReservaAtiva(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao cancelar reserva.')
    } finally {
      setEnviando(false)
    }
  }

  return {
    aluno,
    pontos,
    reservaAtiva,
    pontoSelecionado,
    carregando,
    enviando,
    erro,
    dataDaViagem,
    janelaEstaAberta,
    cancelamentoEstaPermitido,
    confirmarReserva,
    cancelarReserva,
    selecionarPonto: setPontoSelecionado,
  }
}
