import type { StudentHomeSummary } from '../types/student-home'

// Sem registros inventados para a conta autenticada e sem persistência.
// Uma futura fonte de API poderá fornecer o mesmo modelo de apresentação.
export function getMockStudentHome(): StudentHomeSummary {
  return { currentReservation: null, futureReservation: null }
}
