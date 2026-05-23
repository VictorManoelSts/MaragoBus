import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { advertenciaService } from '@/services/advertenciaService'
import { StatusAluno } from '@/types/aluno'
import type { Advertencia } from '@/types/advertencia'

export interface UseSuspensaoModalReturn {
  mostrar: boolean
  advertencias: Advertencia[]
  dataReativacao: string | null
  carregando: boolean
  fechar: () => void
}

export function useSuspensaoModal(): UseSuspensaoModalReturn {
  const [mostrar, setMostrar] = useState(false)
  const [advertencias, setAdvertencias] = useState<Advertencia[]>([])
  const [dataReativacao, setDataReativacao] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  const uid = auth.currentUser?.uid ?? null

  useEffect(() => {
    if (!uid) {
      setCarregando(false)
      return
    }

    async function carregar() {
      const snap = await getDoc(doc(db, 'alunos', uid!))

      if (!snap.exists()) {
        setCarregando(false)
        return
      }

      const dados = snap.data()

      if (dados.status === StatusAluno.Suspenso) {
        const advs = await advertenciaService.buscarAdvertencias(uid!)
        setAdvertencias(advs)
        setDataReativacao(dados.dataReativacao ?? null)
        setMostrar(true)
      }

      setCarregando(false)
    }

    carregar().catch(() => setCarregando(false))
  }, [uid])

  return {
    mostrar,
    advertencias,
    dataReativacao,
    carregando,
    fechar: () => setMostrar(false),
  }
}
