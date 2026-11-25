import type { StudentReservationSummary } from './student-home'

export interface BoardingPointOption {
  id: string
  name: string
}

/** Contexto informativo do formulário, não representa uma reserva criada. */
export interface ReservationFormContext {
  college: StudentReservationSummary['college'] | null
  boardingPoints: readonly BoardingPointOption[]
  defaultBoardingPointId: string | null
}
