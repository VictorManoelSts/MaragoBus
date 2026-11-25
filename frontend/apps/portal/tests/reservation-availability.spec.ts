import { describe, expect, it } from 'vitest'
import type { TransportClosure } from '../src/types/reservation-availability'
import {
  findTransportClosure, getNextReservationOpening, getReservationAvailability, getReservationWindow,
  isRegularTravelDay, isReservationWindowOpen, nextRegularTravelDay,
} from '../src/utils/reservation-availability'

describe('Disponibilidade semanal das reservas', () => {
  it.each([
    ['2026-11-16T13:59:00Z', 'open', '2026-11-16'],
    ['2026-11-16T14:00:00Z', 'waiting', '2026-11-17'],
    ['2026-11-16T14:01:00Z', 'waiting', '2026-11-17'],
    ['2026-11-16T19:59:59.999Z', 'waiting', '2026-11-17'],
    ['2026-11-16T20:00:00Z', 'open', '2026-11-17'],
    ['2026-11-16T20:01:00Z', 'open', '2026-11-17'],
    ['2026-11-17T13:59:59.999Z', 'open', '2026-11-17'],
    ['2026-11-17T14:00:00Z', 'waiting', '2026-11-18'],
    ['2026-11-17T14:01:00Z', 'waiting', '2026-11-18'],
    ['2026-11-17T20:00:00Z', 'open', '2026-11-18'],
    ['2026-11-18T20:00:00Z', 'open', '2026-11-19'],
    ['2026-11-19T20:00:00Z', 'open', '2026-11-20'],
    ['2026-11-20T19:59:00Z', 'waiting', '2026-11-23'],
    ['2026-11-20T20:00:00Z', 'open', '2026-11-23'],
    ['2026-11-21T15:00:00Z', 'open', '2026-11-23'],
    ['2026-11-22T15:00:00Z', 'open', '2026-11-23'],
    ['2026-11-23T13:59:00Z', 'open', '2026-11-23'],
    ['2026-11-23T14:01:00Z', 'waiting', '2026-11-24'],
  ])('em %s calcula %s para %s', (instant, status, travelDate) => {
    const result = getReservationAvailability(new Date(instant))
    expect(result.status).toBe(status)
    expect((result.status === 'open' ? result.window : result.nextWindow).travelDate).toBe(travelDate)
  })

  it('reconhece dias regulares e pula o fim de semana na virada do mês', () => {
    expect(isRegularTravelDay('2026-07-31')).toBe(true)
    expect(isRegularTravelDay('2026-08-01')).toBe(false)
    expect(isRegularTravelDay('2026-08-02')).toBe(false)
    expect(nextRegularTravelDay('2026-07-31')).toBe('2026-08-03')
    expect(() => getReservationWindow('2026-08-01')).toThrow(RangeError)
  })

  it('calcula abertura e encerramento de segunda em Maceió', () => {
    const window = getReservationWindow('2026-11-23')
    expect(window.opensAt.toISOString()).toBe('2026-11-20T20:00:00.000Z')
    expect(window.closesAt.toISOString()).toBe('2026-11-23T14:00:00.000Z')
    expect(isReservationWindowOpen(window, window.opensAt)).toBe(true)
    expect(isReservationWindowOpen(window, window.closesAt)).toBe(false)
  })

  it('mantém a janela na virada do ano e do dia civil em Maceió', () => {
    for (const instant of ['2027-01-01T00:00:00Z', '2027-01-01T02:59:59Z', '2027-01-01T03:00:00Z']) {
      const result = getReservationAvailability(new Date(instant))
      expect(result).toEqual({ status: 'open', window: getReservationWindow('2027-01-01') })
    }
  })

  it('usa a data de Maceió em vez do dia UTC e aceita o mesmo instante com outro deslocamento', () => {
    const closures: TransportClosure[] = [{ date: '2026-12-31' }]
    const reference = new Date('2027-01-01T02:59:59Z')
    const result = getReservationAvailability(reference, closures)
    expect(result).toMatchObject({ status: 'no-service', closure: closures[0] })
    expect(getReservationAvailability(new Date('2027-01-01T11:59:59+09:00'), closures)).toEqual(result)
    expect(getReservationAvailability(new Date('2027-01-01T03:00:00Z'), closures).status).toBe('waiting')
  })
})

describe('Interrupções no transporte', () => {
  const closure: TransportClosure = { date: '2026-11-18', reason: 'Feriado' }
  const closures = [closure]

  it('bloqueia a viagem cadastrada e preserva a janela regular de outro dia', () => {
    expect(findTransportClosure('2026-11-17', closures)).toBeUndefined()
    expect(getReservationAvailability(new Date('2026-11-17T13:00:00Z'), closures)).toMatchObject({
      status: 'open', window: { travelDate: '2026-11-17' },
    })
    for (const instant of ['2026-11-17T20:00:00Z', '2026-11-18T13:00:00Z']) {
      expect(getReservationAvailability(new Date(instant), closures)).toMatchObject({
        status: 'no-service', closure,
      })
    }
  })

  it('deixa indefinida a janela cuja abertura seria durante a interrupção', () => {
    const nextWindow = getReservationWindow('2026-11-20')
    expect(findTransportClosure('2026-11-19', closures)).toBeUndefined()
    expect(getNextReservationOpening(new Date('2026-11-18T20:00:00Z'), closures)).toEqual(nextWindow)
    expect(getReservationAvailability(new Date('2026-11-19T13:00:00Z'), closures)).toEqual({
      status: 'waiting', nextWindow,
    })
    expect(getReservationAvailability(nextWindow.opensAt, closures)).toEqual({ status: 'open', window: nextWindow })
  })

  it('reconhece duas datas consecutivas e pula as janelas afetadas', () => {
    const second: TransportClosure = { date: '2026-11-19', reason: 'Recesso' }
    const consecutive = [...closures, second]
    expect(getReservationAvailability(new Date('2026-11-18T13:00:00Z'), consecutive)).toMatchObject({
      status: 'no-service', closure, nextWindow: { travelDate: '2026-11-23' },
    })
    expect(getReservationAvailability(new Date('2026-11-19T13:00:00Z'), consecutive)).toMatchObject({
      status: 'no-service', closure: second, nextWindow: { travelDate: '2026-11-23' },
    })
  })

  it('preserva a janela de segunda quando a interrupção é apenas no sábado', () => {
    const result = getReservationAvailability(new Date('2026-11-21T15:00:00Z'), [{ date: '2026-11-21' }])
    expect(result).toEqual({ status: 'open', window: getReservationWindow('2026-11-23') })
  })
})
