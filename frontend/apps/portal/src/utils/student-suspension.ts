import type { TravelDate } from '../types/reservation-availability'
import { getTransportDate } from './reservation-availability'

export type StudentSuspension =
  | { kind: 'determined'; returnDate: TravelDate }
  | { kind: 'indefinite' }

export function getActiveSuspension(suspension: StudentSuspension | undefined, reference: Date) {
  if (suspension?.kind === 'determined' && getTransportDate(reference) >= suspension.returnDate) {
    return undefined
  }
  return suspension
}
