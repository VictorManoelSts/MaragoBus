import { transportTimeZone } from './reservation-availability'

const civilDateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' })
const transportDateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: transportTimeZone,
})

export function formatCivilDate(date: string): string {
  return civilDateFormat.format(new Date(`${date}T00:00:00Z`))
}

export function formatTransportDateTime(instant: string | number | Date): string {
  return transportDateTimeFormat.format(typeof instant === 'string' ? Date.parse(instant) : instant)
}
