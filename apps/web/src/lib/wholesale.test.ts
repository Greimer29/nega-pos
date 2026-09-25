import { describe, expect, it } from 'vitest'
import {
  formatWholesalePackSummary,
  formatWholesaleQuantityShort,
  lineInventoryQuantity,
} from './wholesale'

describe('wholesale labels', () => {
  it('summarizes packs to inventory units', () => {
    expect(formatWholesalePackSummary(10, 20)).toBe('10 paq. × 20 und = 200 und')
    expect(formatWholesaleQuantityShort(10, 20)).toBe('10 paq · 200 und')
  })

  it('multiplies inventory quantity for wholesale lines', () => {
    expect(lineInventoryQuantity(10, true, 20)).toBe(200)
    expect(lineInventoryQuantity(10, false, 20)).toBe(10)
  })
})
