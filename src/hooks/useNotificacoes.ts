import { useState, useEffect, useCallback } from 'react'
import { auth } from '@/lib/firebase'
import { notificacaoService } from '@/services/notificacaoService'
import type { Notificacao } from '@/types/notificacao'

export interface UseNotificacoesReturn {
  notificacoes: Notificacao[]
  naoLidas: number
  carregando: boolean
  marcarTodasComoLidas: () => Promise<void>
}

export function useNotificacoes(): UseNotificacoesReturn {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [carregando, setCarregando] = useState(true)

  const uid = auth.currentUser?.uid ?? null

  useEffect(() => {
    if (!uid) {
      setCarregando(false)
      return
    }
    notificacaoService
      .buscarNotificacoes(uid)
      .then((lista) => {
        setNotificacoes(lista)
        setCarregando(false)
      })
      .catch(() => setCarregando(false))
  }, [uid])

  const naoLidas = notificacoes.filter((n) => !n.lida).length

  const marcarTodasComoLidas = useCallback(async () => {
    const pendentes = notificacoes.filter((n) => !n.lida)
    if (pendentes.length === 0) return
    await Promise.all(pendentes.map((n) => notificacaoService.marcarComoLida(n.id)))
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
  }, [notificacoes])

  return { notificacoes, naoLidas, carregando, marcarTodasComoLidas }
}
