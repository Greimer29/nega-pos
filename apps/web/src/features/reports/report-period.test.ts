import { describe, expect, it } from 'vitest'
import { currentYearIso, currentYearRange } from '@/features/reports/constants'
import {
  applyPeriodToSearchParams,
  defaultReportPeriodState,
  parsePeriodFromSearchParams,
  periodLabelFromState,
  periodStateToAccountParams,
} from '@/features/reports/report-period'

describe('report-period year mode', () => {
  const year = currentYearIso()
  const { from, to } = currentYearRange()

  it('defaults to current calendar year', () => {
    const state = defaultReportPeriodState()
    expect(state.mode).toBe('year')
    expect(state.from).toBe(from)
    expect(state.to).toBe(to)
  })

  it('maps year mode to from/to account params', () => {
    expect(
      periodStateToAccountParams({
        mode: 'year',
        month: `${year}-07`,
        date: `${year}-07-09`,
        from,
        to,
      })
    ).toEqual({ from, to })
  })

  it('serializes and parses year mode in URL params', () => {
    const state = defaultReportPeriodState()
    const params = applyPeriodToSearchParams(new URLSearchParams(), state)

    expect(params.get('year')).toBe('1')
    expect(params.get('from')).toBe(from)
    expect(params.get('to')).toBe(to)
    expect(params.get('range')).toBeNull()

    const restored = parsePeriodFromSearchParams(params)
    expect(restored.mode).toBe('year')
    expect(restored.from).toBe(from)
    expect(restored.to).toBe(to)
  })

  it('labels year mode as Año YYYY', () => {
    expect(
      periodLabelFromState({
        mode: 'year',
        month: `${year}-01`,
        date: `${year}-01-01`,
        from,
        to,
      })
    ).toBe(`Año ${year}`)
  })

  it('falls back to year default when search params are empty', () => {
    const restored = parsePeriodFromSearchParams(new URLSearchParams())
    expect(restored.mode).toBe('year')
    expect(restored.from).toBe(from)
    expect(restored.to).toBe(to)
  })
})
