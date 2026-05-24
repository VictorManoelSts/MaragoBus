import { useState, useEffect, useMemo } from 'react'
import { feriadoService } from '@/services/feriadoService'
import { TipoFeriado } from '@/types/feriado'
import type { Feriado } from '@/types/feriado'

export interface UseFeriadosReturn {
  feriados: Feriado[]
  carregando: boolean
  erro: string | null
  adicionar: (data: string, nome: string, tipo: TipoFeriado) => Promise<void>
  remover: (id: string) => Promise<void>
  avisos: Feriado[]
}

export function useFeriados(agora: Date = new Date()): UseFeriadosReturn {
  const ano = agora.getFullYear()

  const [feriados, setFeriados] = useState<Feriado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      setCarregando(true)
      setErro(null)
      try {
        await feriadoService.sincronizarNacionais(ano)
        const dados = await feriadoService.buscarFeriados(ano)
        if (!cancelado) setFeriados(dados)
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : 'Erro ao carregar feriados.')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    carregar()
    return () => { cancelado = true }
  }, []) // agora é capturado no closure; não muda durante o ciclo de vida

  const avisos = useMemo(
    () => feriadoService.verificarAvisos(feriados, agora),
    [feriados] // agora é capturado no closure
  )

  async function adicionar(data: string, nome: string, tipo: TipoFeriado): Promise<void> {
    const id = await feriadoService.adicionarFeriado(data, nome, tipo)
    const novo: Feriado = { id, data, nome, tipo }
    setFeriados(prev => [...prev, novo].sort((a, b) => a.data.localeCompare(b.data)))
  }

  async function remover(id: string): Promise<void> {
    await feriadoService.removerFeriado(id)
    setFeriados(prev => prev.filter(f => f.id !== id))
  }

  return { feriados, carregando, erro, adicionar, remover, avisos }
}
