import type {
  ReservationAvailability, ReservationWindow, TransportClosure, TravelDate,
} from '../types/reservation-availability'

export const transportTimeZone = 'America/Maceio'

const transportClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: transportTimeZone,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
})

function transportWallTime(instant: Date) {
  const parts = Object.fromEntries(transportClock.formatToParts(instant).map(({ type, value }) => [type, value]))
  return `${parts.year.padStart(4, '0')}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`
}

export function getTransportDate(instant: Date): TravelDate {
  return transportWallTime(instant).slice(0, 10)
}

function transportInstant(date: TravelDate, hour: '11' | '16' | '17'): Date {
  // Interpret the civil time as UTC only to compute the zone offset at that date.
  const wallTime = Date.parse(`${date}T${hour}:00:00Z`)
  const offset = Date.parse(transportWallTime(new Date(wallTime))) - wallTime
  return new Date(wallTime - offset)
}

export function getCancellationDeadline(date: TravelDate): Date {
  return transportInstant(date, '16')
}

function civilDate(date: TravelDate): Date {
  return new Date(`${date}T00:00:00Z`)
}

export function isRegularTravelDay(date: TravelDate): boolean {
  const weekday = civilDate(date).getUTCDay()
  return weekday >= 1 && weekday <= 5
}

function adjacentRegularTravelDay(date: TravelDate, direction: 1 | -1): TravelDate {
  const cursor = civilDate(date)
  do {
    cursor.setUTCDate(cursor.getUTCDate() + direction)
    date = cursor.toISOString().slice(0, 10)
  } while (!isRegularTravelDay(date))
  return date
}

export function nextRegularTravelDay(date: TravelDate): TravelDate {
  return adjacentRegularTravelDay(date, 1)
}

export function findTransportClosure(date: TravelDate, closures: readonly TransportClosure[]) {
  return closures.find(closure => closure.date === date)
}

export function getReservationWindow(travelDate: TravelDate): ReservationWindow {
  if (!isRegularTravelDay(travelDate)) throw new RangeError('A viagem deve ocorrer em um dia regular.')
  return {
    travelDate,
    opensAt: transportInstant(adjacentRegularTravelDay(travelDate, -1), '17'),
    closesAt: transportInstant(travelDate, '11'),
  }
}

export function isReservationWindowOpen(window: ReservationWindow, reference: Date): boolean {
  return reference >= window.opensAt && reference < window.closesAt
}

function hasKnownWindow(date: TravelDate, closures: readonly TransportClosure[]): boolean {
  // An interruption on the normal opening day leaves the following opening undefined.
  return !findTransportClosure(date, closures)
    && !findTransportClosure(adjacentRegularTravelDay(date, -1), closures)
}

export function getNextReservationOpening(
  reference: Date, closures: readonly TransportClosure[] = [],
): ReservationWindow {
  const today = getTransportDate(reference)
  let date = nextRegularTravelDay(today)
  while (true) {
    const window = getReservationWindow(date)
    if (window.opensAt > reference && hasKnownWindow(date, closures)) return window
    date = nextRegularTravelDay(date)
  }
}

export function getReservationAvailability(
  reference: Date, closures: readonly TransportClosure[] = [],
): ReservationAvailability {
  const today = getTransportDate(reference)
  const nextDate = nextRegularTravelDay(today)
  const candidate = isRegularTravelDay(today) && reference < getReservationWindow(today).closesAt
    ? today : nextDate
  const window = getReservationWindow(candidate)
  if (hasKnownWindow(candidate, closures) && isReservationWindowOpen(window, reference)) {
    return { status: 'open', window }
  }

  const closure = findTransportClosure(today, closures) ?? findTransportClosure(candidate, closures)
  const nextWindow = getNextReservationOpening(reference, closures)
  return closure ? { status: 'no-service', closure, nextWindow } : { status: 'waiting', nextWindow }
}
