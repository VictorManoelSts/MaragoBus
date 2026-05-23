import { useState, useEffect } from 'react'
import { adminService } from '@/services/adminService'
import type { DadosCadastro } from '@/services/adminService'
import type { Ponto } from '@/types/ponto'

export interface UseCadastroAlunoReturn {
  pontos: Ponto[]
  carregandoPontos: boolean
  salvando: boolean
  salvar: (dados: DadosCadastro) => Promise<void>
}

export function useCadastroAluno(): UseCadastroAlunoReturn {
  const [pontos, setPontos] = useState<Ponto[]>([])
  const [carregandoPontos, setCarregandoPontos] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      setCarregandoPontos(true)
      try {
        const resultado = await adminService.buscarPontos()
        if (!cancelado) setPontos(resultado)
      } catch {
        if (!cancelado) setPontos([])
      } finally {
        if (!cancelado) setCarregandoPontos(false)
      }
    }

    carregar()
    return () => { cancelado = true }
  }, [])

  async function salvar(dados: DadosCadastro): Promise<void> {
    setSalvando(true)
    try {
      await adminService.cadastrarAluno(dados)
    } finally {
      setSalvando(false)
    }
  }

  return { pontos, carregandoPontos, salvando, salvar }
}
