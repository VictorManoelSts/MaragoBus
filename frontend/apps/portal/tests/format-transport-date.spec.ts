import { expect, it } from 'vitest'
import { formatCivilDate, formatTransportDateTime } from '../src/utils/format-transport-date'

it('preserva a data civil e converte instantes perto da meia-noite em Maceió', () => {
  expect(formatCivilDate('2026-11-17')).toBe('17/11/2026')
  expect(formatTransportDateTime('2026-11-17T02:59:00Z')).toMatch(/^16\/11\/2026.*23:59$/)
  expect(formatTransportDateTime(new Date('2026-11-17T03:00:00Z'))).toMatch(/^17\/11\/2026.*00:00$/)
  expect(formatTransportDateTime(Date.parse('2026-11-17T03:00:00Z')))
    .toBe(formatTransportDateTime('2026-11-17T03:00:00Z'))
})
