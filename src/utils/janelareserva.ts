import { BUSINESS } from '@/constants/business'

function toDataLocal(data: Date): string {
  const y = data.getFullYear()
  const m = String(data.getMonth() + 1).padStart(2, '0')
  const d = String(data.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isDiaUtil(data: Date, feriados: Set<string>): boolean {
  const dia = data.getDay()
  return dia !== 0 && dia !== 6 && !feriados.has(toDataLocal(data))
}

/** Retorna true se a janela de reservas está aberta (17h–11h). */
export function janelaAberta(agora: Date): boolean {
  const hora = agora.getHours()
  return hora >= BUSINESS.reserva.aberturaHora || hora < BUSINESS.reserva.encerramentoHora
}

/**
 * Retorna o primeiro dia útil a partir de `data` (inclusive),
 * ignorando fins de semana e feriados da lista fornecida.
 * `feriados` deve conter strings no formato "YYYY-MM-DD".
 */
export function proximoDiaUtil(data: Date, feriados: string[]): Date {
  const feriadoSet = new Set(feriados)
  const atual = new Date(data.getFullYear(), data.getMonth(), data.getDate())

  while (!isDiaUtil(atual, feriadoSet)) {
    atual.setDate(atual.getDate() + 1)
  }

  return atual
}

/** Retorna true se o cancelamento ainda é permitido (antes das 16h). */
export function cancelamentoPermitido(agora: Date): boolean {
  return agora.getHours() < BUSINESS.reserva.cancelamentoHora
}
