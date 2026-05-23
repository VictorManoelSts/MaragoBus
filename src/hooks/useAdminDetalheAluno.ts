import { useState, useEffect } from 'react'
import { adminService } from '@/services/adminService'
import { alunoService } from '@/services/alunoService'
import { advertenciaService } from '@/services/advertenciaService'
import { auth } from '@/lib/firebase'
import type { Aluno } from '@/types/aluno'
import type { Advertencia } from '@/types/advertencia'

export interface UseAdminDetalheAlunoReturn {
  aluno: Aluno | null
  advertencias: Advertencia[]
  carregando: boolean
  erro: string | null
  aplicarAdvertencia: (motivo: string) => Promise<void>
  suspenderAluno: () => Promise<void>
  reativarAluno: () => Promise<void>
  excluirAluno: () => Promise<void>
}

export function useAdminDetalheAluno(alunoId: string): UseAdminDetalheAlunoReturn {
  const [aluno, setAluno] = useState<Aluno | null>(null)
  const [advertencias, setAdvertencias] = useState<Advertencia[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  async function recarregar() {
    setCarregando(true)
    setErro(null)
    try {
      const resultado = await adminService.buscarDetalheAluno(alunoId)
      setAluno(resultado.aluno)
      setAdvertencias(resultado.advertencias)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar aluno.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      setCarregando(true)
      setErro(null)
      try {
        const resultado = await adminService.buscarDetalheAluno(alunoId)
        if (!cancelado) {
          setAluno(resultado.aluno)
          setAdvertencias(resultado.advertencias)
        }
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : 'Erro ao carregar aluno.')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    carregar()
    return () => { cancelado = true }
  }, [alunoId])

  async function aplicarAdvertencia(motivo: string): Promise<void> {
    const adminId = auth.currentUser?.uid ?? 'admin'
    await advertenciaService.aplicarAdvertencia(alunoId, motivo, adminId)
    await recarregar()
  }

  async function suspenderAluno(): Promise<void> {
    await adminService.suspenderAluno(alunoId, new Date())
    await recarregar()
  }

  async function reativarAluno(): Promise<void> {
    await alunoService.reativarAluno(alunoId)
    await recarregar()
  }

  async function excluirAluno(): Promise<void> {
    await adminService.excluirAluno(alunoId)
  }

  return {
    aluno,
    advertencias,
    carregando,
    erro,
    aplicarAdvertencia,
    suspenderAluno,
    reativarAluno,
    excluirAluno,
  }
}
