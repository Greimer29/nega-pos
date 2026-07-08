import { describe, expect, it } from 'vitest'

import { isValidEntityId, parsePositiveIntRouteParam } from './route-id'

describe('parsePositiveIntRouteParam', () => {
  it('accepts positive integer strings', () => {
    expect(parsePositiveIntRouteParam('42')).toEqual({ id: 42, isValid: true })
  })

  it('rejects empty, non-numeric and zero values', () => {
    expect(parsePositiveIntRouteParam(undefined)).toEqual({ id: 0, isValid: false })
    expect(parsePositiveIntRouteParam('abc')).toEqual({ id: 0, isValid: false })
    expect(parsePositiveIntRouteParam('0')).toEqual({ id: 0, isValid: false })
    expect(parsePositiveIntRouteParam('-1')).toEqual({ id: 0, isValid: false })
    expect(parsePositiveIntRouteParam('1.5')).toEqual({ id: 0, isValid: false })
  })
})

describe('isValidEntityId', () => {
  it('accepts positive integers', () => {
    expect(isValidEntityId(1)).toBe(true)
    expect(isValidEntityId(999)).toBe(true)
  })

  it('rejects invalid values', () => {
    expect(isValidEntityId(0)).toBe(false)
    expect(isValidEntityId(-1)).toBe(false)
    expect(isValidEntityId(1.5)).toBe(false)
    expect(isValidEntityId(NaN)).toBe(false)
    expect(isValidEntityId(undefined)).toBe(false)
    expect(isValidEntityId('1')).toBe(false)
    expect(isValidEntityId({ id: 1, isValid: true })).toBe(false)
  })
})
