/** Resumo de apresentação; não calcula janelas de reserva ou comprovantes. */
export interface StudentReservationSummary {
  id: string
  travelDate: string // Data civil ISO (YYYY-MM-DD), sem conversão de fuso.
  college: string
  boardingPoint: string
  status: 'confirmed' | 'cancelled'
}

export interface StudentHomeSummary {
  currentReservation: StudentReservationSummary | null
  futureReservation: StudentReservationSummary | null
}
