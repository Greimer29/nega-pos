import { describe, expect, it } from 'vitest'

import { addLocalDaysIsoDate, formatFecha, todayLocalIsoDate } from './format-date'

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

describe('todayLocalIsoDate / addLocalDaysIsoDate', () => {
  it('returns YYYY-MM-DD', () => {
    expect(todayLocalIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('adds calendar days in local time', () => {
    expect(addLocalDaysIsoDate(15, new Date(2026, 9, 4))).toBe('2026-10-19')
  })
})
