import { useState, useEffect } from 'react'
import { adminService } from '@/services/adminService'
import type { Ponto } from '@/types/ponto'

export interface UsePontosReturn {
  pontos: Ponto[]
  carregando: boolean
  erro: string | null
  adicionar: (nome: string) => Promise<void>
  editar: (id: string, nome: string) => Promise<void>
  remover: (id: string, nome: string) => Promise<void>
}

export function usePontos(): UsePontosReturn {
  const [pontos, setPontos] = useState<Ponto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      setCarregando(true)
      setErro(null)
      try {
        const dados = await adminService.buscarPontos()
        if (!cancelado) setPontos(dados)
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : 'Erro ao carregar pontos.')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    carregar()
    return () => { cancelado = true }
  }, [])

  async function adicionar(nome: string): Promise<void> {
    const id = await adminService.adicionarPonto(nome)
    const novo: Ponto = { id, nome, ativo: true }
    setPontos((prev) => [...prev, novo])
  }

  async function editar(id: string, nome: string): Promise<void> {
    await adminService.editarPonto(id, nome)
    setPontos((prev) => prev.map((p) => (p.id === id ? { ...p, nome } : p)))
  }

  async function remover(id: string, nome: string): Promise<void> {
    await adminService.removerPonto(id, nome)
    setPontos((prev) => prev.filter((p) => p.id !== id))
  }

  return { pontos, carregando, erro, adicionar, editar, remover }
}
