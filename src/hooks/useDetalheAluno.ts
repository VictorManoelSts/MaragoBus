import { useState, useEffect } from 'react'
import { motoristaService } from '@/services/motoristaService'
import type { Aluno } from '@/types/aluno'

export interface UseDetalheAlunoReturn {
  aluno: Aluno | null
  pontoEscolhido: string | null
  carregando: boolean
  erro: string | null
}

export function useDetalheAluno(alunoId: string, agora: Date = new Date()): UseDetalheAlunoReturn {
  const [aluno, setAluno] = useState<Aluno | null>(null)
  const [pontoEscolhido, setPontoEscolhido] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      setCarregando(true)
      setErro(null)
      try {
        const resultado = await motoristaService.buscarDetalheAluno(alunoId, agora)
        if (!cancelado) {
          setAluno(resultado.aluno)
          setPontoEscolhido(resultado.pontoEscolhido)
        }
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : 'Erro ao carregar aluno.')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    carregar()
    return () => { cancelado = true }
  }, [alunoId]) // agora é capturado no closure; não muda durante o ciclo de vida

  return { aluno, pontoEscolhido, carregando, erro }
}
