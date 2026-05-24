import { useState, useEffect } from 'react'
import { adminService } from '@/services/adminService'
import type { SolicitacaoComDetalhes } from '@/services/adminService'

export interface UseSolicitacoesReturn {
  solicitacoes: SolicitacaoComDetalhes[]
  carregando: boolean
  confirmar: (id: string, alunoId: string, motivo: string, justificativa: string) => Promise<void>
  rejeitar: (id: string, justificativa: string) => Promise<void>
}

export function useSolicitacoes(): UseSolicitacoesReturn {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoComDetalhes[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      setCarregando(true)
      try {
        const dados = await adminService.buscarSolicitacoesPendentes()
        if (!cancelado) setSolicitacoes(dados)
      } catch {
        if (!cancelado) setSolicitacoes([])
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    carregar()
    return () => { cancelado = true }
  }, [])

  async function confirmar(
    id: string,
    alunoId: string,
    motivo: string,
    justificativa: string,
  ): Promise<void> {
    await adminService.confirmarSolicitacao(id, alunoId, motivo, justificativa)
    setSolicitacoes((prev) => prev.filter((s) => s.id !== id))
  }

  async function rejeitar(id: string, justificativa: string): Promise<void> {
    await adminService.rejeitarSolicitacao(id, justificativa)
    setSolicitacoes((prev) => prev.filter((s) => s.id !== id))
  }

  return { solicitacoes, carregando, confirmar, rejeitar }
}
