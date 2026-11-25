import type { StudentReservationSummary } from './student-home'

export type TravelDate = StudentReservationSummary['travelDate']

export interface TransportClosure {
  date: TravelDate
  reason?: 'Feriado' | 'Recesso' | 'Manutenção' | 'Outra interrupção'
  description?: string
}

export interface ReservationWindow {
  travelDate: TravelDate
  opensAt: Date
  closesAt: Date
}

export type ReservationAvailability =
  | { status: 'open'; window: ReservationWindow }
  | { status: 'waiting'; nextWindow: ReservationWindow }
  | { status: 'no-service'; closure: TransportClosure; nextWindow: ReservationWindow }
