import { useState, useEffect, useMemo } from 'react'
import { adminService } from '@/services/adminService'
import { BUSINESS } from '@/constants/business'
import type { ReservaAdmin } from '@/services/adminService'

export interface MetricasReserva {
  hoje: number
  amanha: number
  total: number
}

export interface UseAdminReservasReturn {
  aba: 'hoje' | 'amanha'
  reservasAgrupadas: Record<string, ReservaAdmin[]>
  metricas: MetricasReserva
  abaAmanhaDisponivel: boolean
  carregando: boolean
  erro: string | null
  selecionarAba: (aba: 'hoje' | 'amanha') => void
}

function toDataLocal(data: Date): string {
  const y = data.getFullYear()
  const m = String(data.getMonth() + 1).padStart(2, '0')
  const d = String(data.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function diaSeguinteLocal(agora: Date): string {
  const amanha = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1)
  return toDataLocal(amanha)
}

export function useAdminReservas(agora: Date = new Date()): UseAdminReservasReturn {
  const [aba, setAba] = useState<'hoje' | 'amanha'>('hoje')
  const [reservasHoje, setReservasHoje] = useState<ReservaAdmin[]>([])
  const [reservasAmanha, setReservasAmanha] = useState<ReservaAdmin[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const abaAmanhaDisponivel = agora.getHours() >= BUSINESS.reserva.aberturaHora

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      setCarregando(true)
      setErro(null)
      try {
        const promises: Promise<ReservaAdmin[]>[] = [
          adminService.buscarReservasDia(toDataLocal(agora)),
        ]
        if (abaAmanhaDisponivel) {
          promises.push(adminService.buscarReservasDia(diaSeguinteLocal(agora)))
        }
        const [hojeData, amanhaData = []] = await Promise.all(promises)
        if (!cancelado) {
          setReservasHoje(hojeData)
          setReservasAmanha(amanhaData)
        }
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : 'Erro ao carregar reservas.')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    carregar()
    return () => { cancelado = true }
  }, []) // agora e abaAmanhaDisponivel são capturados no closure

  const reservas = aba === 'hoje' ? reservasHoje : reservasAmanha

  const reservasAgrupadas = useMemo(
    () =>
      reservas.reduce<Record<string, ReservaAdmin[]>>((acc, r) => {
        const fac = r.aluno.faculdade
        if (!acc[fac]) acc[fac] = []
        acc[fac].push(r)
        return acc
      }, {}),
    [reservas]
  )

  const metricas = useMemo<MetricasReserva>(
    () => ({
      hoje: reservasHoje.length,
      amanha: reservasAmanha.length,
      total: reservasHoje.length + reservasAmanha.length,
    }),
    [reservasHoje, reservasAmanha]
  )

  return {
    aba,
    reservasAgrupadas,
    metricas,
    abaAmanhaDisponivel,
    carregando,
    erro,
    selecionarAba: setAba,
  }
}
