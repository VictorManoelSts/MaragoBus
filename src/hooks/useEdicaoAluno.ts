import { useState, useEffect } from 'react'
import { adminService } from '@/services/adminService'
import type { CamposEditaveis } from '@/services/adminService'
import type { Aluno } from '@/types/aluno'

export interface UseEdicaoAlunoReturn {
  aluno: Aluno | null
  carregando: boolean
  erro: string | null
  salvando: boolean
  salvar: (dados: Partial<CamposEditaveis>) => Promise<void>
}

export function useEdicaoAluno(alunoId: string): UseEdicaoAlunoReturn {
  const [aluno, setAluno] = useState<Aluno | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      setCarregando(true)
      setErro(null)
      try {
        const resultado = await adminService.buscarDetalheAluno(alunoId)
        if (!cancelado) setAluno(resultado.aluno)
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : 'Erro ao carregar aluno.')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    carregar()
    return () => { cancelado = true }
  }, [alunoId])

  async function salvar(dados: Partial<CamposEditaveis>): Promise<void> {
    setSalvando(true)
    try {
      await adminService.editarAluno(alunoId, dados)
    } finally {
      setSalvando(false)
    }
  }

  return { aluno, carregando, erro, salvando, salvar }
}
