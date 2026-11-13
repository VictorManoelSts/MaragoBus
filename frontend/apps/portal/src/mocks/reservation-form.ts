import type { ReservationFormContext } from '../types/reservation-form'

export function getMockReservationForm(): ReservationFormContext {
  return {
    travelDate: '2026-11-16',
    college: null,
    defaultBoardingPointId: null,
    boardingPoints: [
      { id: 'demo-center', name: 'Praça de exemplo — Centro' },
      { id: 'demo-north', name: 'Parada de exemplo — Bairro Norte' },
      { id: 'demo-south', name: 'Parada de exemplo — Bairro Sul' },
    ],
  }
}
