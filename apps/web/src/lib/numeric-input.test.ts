import { describe, expect, it } from 'vitest'

import { formatDecimalOnBlur, parseDecimalInput, resolveNumericInputStep, sanitizeDecimalInput } from './numeric-input'

describe('sanitizeDecimalInput', () => {
  it('limits to two decimals while typing', () => {
    expect(sanitizeDecimalInput('12.345', 2)).toBe('12.34')
    expect(sanitizeDecimalInput('10,567', 2)).toBe('10.56')
  })

  it('allows partial decimal input', () => {
    expect(sanitizeDecimalInput('10.', 2)).toBe('10.')
    expect(sanitizeDecimalInput('10.5', 2)).toBe('10.5')
  })
})

describe('formatDecimalOnBlur', () => {
  it('rounds to two decimals on blur', () => {
    expect(formatDecimalOnBlur('12.345', 2)).toBe('12.35')
    expect(formatDecimalOnBlur('10', 2)).toBe('10')
  })
})

describe('parseDecimalInput', () => {
  it('parses rounded values', () => {
    expect(parseDecimalInput('99.999', 2)).toBe(100)
    expect(parseDecimalInput('', 2)).toBeNull()
  })
})

describe('resolveNumericInputStep', () => {
  it('uses step any for decimal inputs by default', () => {
    expect(resolveNumericInputStep(2)).toBe('any')
    expect(resolveNumericInputStep(4)).toBe('any')
  })

  it('uses step 1 for integer inputs', () => {
    expect(resolveNumericInputStep(0)).toBe(1)
  })

  it('respects explicit step override', () => {
    expect(resolveNumericInputStep(2, 0.01)).toBe(0.01)
    expect(resolveNumericInputStep(2, 1)).toBe(1)
  })
})
