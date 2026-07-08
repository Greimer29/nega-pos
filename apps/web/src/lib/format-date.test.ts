import { describe, expect, it } from 'vitest'

import { formatFecha } from './format-date'

describe('formatFecha', () => {
  it('formats date-only ISO strings', () => {
    expect(formatFecha('2026-06-16')).toBe('16/06/2026')
  })

  it('formats datetime ISO strings using the date part only', () => {
    expect(formatFecha('2026-06-14T23:49:30.000+00:00')).toBe('14/06/2026')
  })
})
