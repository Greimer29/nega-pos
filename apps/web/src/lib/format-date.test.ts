import { describe, expect, it } from 'vitest'

import {
  addLocalDaysIsoDate,
  formatFecha,
  formatFechaInstante,
  todayLocalIsoDate,
} from './format-date'

describe('formatFecha', () => {
  it('formats date-only ISO strings', () => {
    expect(formatFecha('2026-06-16')).toBe('16/06/2026')
  })

  it('formats datetime ISO strings using the date part only', () => {
    expect(formatFecha('2026-06-14T23:49:30.000+00:00')).toBe('14/06/2026')
  })

  it('does not shift UTC midnight to the previous local day', () => {
    // Antes: new Date(...).toLocaleDateString en Caracas mostraba 03/10.
    expect(formatFecha('2026-10-04T00:00:00.000Z')).toBe('04/10/2026')
  })
})

describe('formatFechaInstante', () => {
  it('uses America/Caracas calendar day for evening UTC timestamps', () => {
    // 21:00 Caracas del 14 = 01:00 UTC del 15
    expect(formatFechaInstante('2026-10-15T01:00:00.000Z')).toBe('14/10/2026')
  })
})

describe('todayLocalIsoDate / addLocalDaysIsoDate', () => {
  it('returns YYYY-MM-DD', () => {
    expect(todayLocalIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('adds calendar days from an explicit store-calendar date', () => {
    expect(addLocalDaysIsoDate(15, new Date('2026-10-04T12:00:00-04:00'))).toBe('2026-10-19')
  })
})
