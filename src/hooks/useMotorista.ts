import { useState, useEffect, useMemo } from 'react'
import { motoristaService, MOTORISTA_ERROS } from '@/services/motoristaService'
import type { AlunoComReserva, FiltrosMotorista } from '@/services/motoristaService'

export interface UseMotoristaReturn {
  aba: 'hoje' | 'amanha'
  alunos: AlunoComReserva[]
  alunosAgrupados: Record<string, AlunoComReserva[]>
  faculdadesDisponiveis: string[]
  pontosDisponiveis: string[]
  filtros: FiltrosMotorista
  carregando: boolean
  erro: string | null
  abaAmanhaBloqueada: boolean
  total: number
  selecionarAba: (aba: 'hoje' | 'amanha') => void
  toggleFaculdade: (faculdade: string) => void
  togglePonto: (ponto: string) => void
  solicitarAdvertencia: (alunoId: string, motivo: string) => Promise<void>
}

export function useMotorista(agora: Date = new Date()): UseMotoristaReturn {
  const [aba, setAba] = useState<'hoje' | 'amanha'>('hoje')
  const [listaCompleta, setListaCompleta] = useState<AlunoComReserva[]>([])
  const [filtros, setFiltros] = useState<FiltrosMotorista>({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [abaAmanhaBloqueada, setAbaAmanhaBloqueada] = useState(false)

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      setCarregando(true)
      setErro(null)
      setAbaAmanhaBloqueada(false)

      try {
        const resultado =
          aba === 'hoje'
            ? await motoristaService.buscarAlunosHoje(agora)
            : await motoristaService.buscarAlunosDiaSeguinte(agora)

        if (!cancelado) setListaCompleta(resultado)
      } catch (e) {
        if (cancelado) return
        const code = (e as { code?: string }).code
        if (code === MOTORISTA_ERROS.LISTA_DIA_SEGUINTE_INDISPONIVEL) {
          setAbaAmanhaBloqueada(true)
          setListaCompleta([])
        } else {
          setErro(e instanceof Error ? e.message : 'Erro ao carregar lista.')
        }
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    carregar()
    return () => { cancelado = true }
  }, [aba]) // agora é capturado no closure; não muda durante o ciclo de vida

  const faculdadesDisponiveis = useMemo(
    () => [...new Set(listaCompleta.map((a) => a.aluno.faculdade))].sort(),
    [listaCompleta]
  )

  const pontosDisponiveis = useMemo(
    () => [...new Set(listaCompleta.map((a) => a.pontoEscolhido))].sort(),
    [listaCompleta]
  )

  const alunos = useMemo(
    () =>
      listaCompleta.filter((item) => {
        if (filtros.faculdade && item.aluno.faculdade !== filtros.faculdade) return false
        if (filtros.pontoEmbarque && item.pontoEscolhido !== filtros.pontoEmbarque) return false
        return true
      }),
    [listaCompleta, filtros]
  )

  const alunosAgrupados = useMemo(
    () =>
      alunos.reduce<Record<string, AlunoComReserva[]>>((acc, item) => {
        const fac = item.aluno.faculdade
        if (!acc[fac]) acc[fac] = []
        acc[fac].push(item)
        return acc
      }, {}),
    [alunos]
  )

  function toggleFaculdade(faculdade: string) {
    setFiltros((prev) => ({
      ...prev,
      faculdade: prev.faculdade === faculdade ? undefined : faculdade,
    }))
  }

  function togglePonto(ponto: string) {
    setFiltros((prev) => ({
      ...prev,
      pontoEmbarque: prev.pontoEmbarque === ponto ? undefined : ponto,
    }))
  }

  return {
    aba,
    alunos,
    alunosAgrupados,
    faculdadesDisponiveis,
    pontosDisponiveis,
    filtros,
    carregando,
    erro,
    abaAmanhaBloqueada,
    total: alunos.length,
    selecionarAba: setAba,
    toggleFaculdade,
    togglePonto,
    solicitarAdvertencia: motoristaService.solicitarAdvertencia,
  }
}
