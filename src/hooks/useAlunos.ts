import { useState, useEffect, useMemo } from 'react'
import { alunoService } from '@/services/alunoService'
import { StatusAluno } from '@/types/aluno'
import type { Aluno } from '@/types/aluno'

export type FiltroStatus = 'todos' | 'suspensos' | 'concluindo'

export interface UseAlunosReturn {
  busca: string
  filtroStatus: FiltroStatus
  alunosFiltrados: Aluno[]
  carregando: boolean
  erro: string | null
  total: number
  setBusca: (busca: string) => void
  setFiltroStatus: (filtro: FiltroStatus) => void
  reativarAluno: (alunoId: string) => Promise<void>
}

export function useAlunos(anoAtual: number = new Date().getFullYear()): UseAlunosReturn {
  const [listaCompleta, setListaCompleta] = useState<Aluno[]>([])
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      setCarregando(true)
      setErro(null)
      try {
        const alunos = await alunoService.buscarAlunos()
        if (!cancelado) setListaCompleta(alunos)
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : 'Erro ao carregar alunos.')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    carregar()
    return () => { cancelado = true }
  }, [])

  const alunosFiltrados = useMemo(() => {
    let lista = listaCompleta

    if (filtroStatus === 'suspensos') {
      lista = lista.filter((a) => a.status === StatusAluno.Suspenso)
    } else if (filtroStatus === 'concluindo') {
      lista = lista.filter((a) => a.anoConclusao === anoAtual)
    }

    const termo = busca.trim().toLowerCase()
    if (termo) {
      lista = lista.filter(
        (a) => a.nome.toLowerCase().includes(termo) || a.cpf.includes(termo)
      )
    }

    return lista
  }, [listaCompleta, busca, filtroStatus, anoAtual])

  async function reativarAluno(alunoId: string): Promise<void> {
    await alunoService.reativarAluno(alunoId)
    const alunos = await alunoService.buscarAlunos()
    setListaCompleta(alunos)
  }

  return {
    busca,
    filtroStatus,
    alunosFiltrados,
    carregando,
    erro,
    total: alunosFiltrados.length,
    setBusca,
    setFiltroStatus,
    reativarAluno,
  }
}
