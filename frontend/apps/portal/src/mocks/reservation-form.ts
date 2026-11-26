import type { ReservationFormContext } from '../types/reservation-form'

export function getMockReservationForm(studentId?: string): ReservationFormContext {
  return {
    college: import.meta.env.DEV && !import.meta.env.PROD && studentId === 'mock-student-test' ? 'Faculdade de Demonstração' : null,
    defaultBoardingPointId: null,
    boardingPoints: [
      { id: 'demo-center', name: 'Praça de exemplo — Centro' },
      { id: 'demo-north', name: 'Parada de exemplo — Bairro Norte' },
      { id: 'demo-south', name: 'Parada de exemplo — Bairro Sul' },
    ],
  }
}
