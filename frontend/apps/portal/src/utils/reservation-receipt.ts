import type { StudentReservationSummary } from '../types/student-home'
import { getTransportDate } from './reservation-availability'

export function getReceiptAvailability(
  reservation: Pick<StudentReservationSummary, 'travelDate' | 'status'>,
  reference: Date,
): 'available' | 'future' | 'unavailable' {
  if (reservation.status !== 'confirmed') return 'unavailable'
  const today = getTransportDate(reference)
  if (reservation.travelDate > today) return 'future'
  return reservation.travelDate === today ? 'available' : 'unavailable'
}
