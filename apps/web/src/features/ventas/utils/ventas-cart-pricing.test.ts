import { describe, expect, it } from 'vitest'
import {
  cartLineHasPriceAdjustment,
  cartLineListPrice,
  cartLinePriceAdjustmentKind,
  cartLineSubtotal,
  cartPriceDecimals,
  percentOffPriceUsd,
  percentOfSubtotalUsd,
  priceDraftToUsd,
  usdToPriceDraft,
} from './ventas-cart-pricing'

describe('cart line pricing', () => {
  it('computes subtotal and list price', () => {
    expect(cartLineSubtotal({ quantity: 3, unitPriceUsd: 1.5 })).toBe(4.5)
    expect(cartLineListPrice({ quantity: 1, unitPriceUsd: 2 })).toBe(2)
    expect(cartLineListPrice({ quantity: 1, unitPriceUsd: 2, listPriceUsd: 3 })).toBe(3)
  })

  it('detects price adjustments beyond rounding noise', () => {
    expect(cartLineHasPriceAdjustment({ quantity: 1, unitPriceUsd: 2 })).toBe(false)
    expect(
      cartLineHasPriceAdjustment({ quantity: 1, unitPriceUsd: 2, listPriceUsd: 2.00005 })
    ).toBe(false)
    expect(cartLineHasPriceAdjustment({ quantity: 1, unitPriceUsd: 2, listPriceUsd: 2.5 })).toBe(
      true
    )
  })

  it('classifies the adjustment as discount or markup', () => {
    expect(cartLinePriceAdjustmentKind({ quantity: 1, unitPriceUsd: 2 })).toBeNull()
    expect(
      cartLinePriceAdjustmentKind({ quantity: 1, unitPriceUsd: 2, listPriceUsd: 2.5 })
    ).toBe('discount')
    expect(
      cartLinePriceAdjustmentKind({ quantity: 1, unitPriceUsd: 3, listPriceUsd: 2.5 })
    ).toBe('markup')
  })
})

describe('percent helpers', () => {
  it('applies percent off and percent of subtotal, never negative', () => {
    expect(percentOffPriceUsd(10, 20)).toBe(8)
    expect(percentOffPriceUsd(10, 150)).toBe(0)
    expect(percentOfSubtotalUsd(50, 10)).toBe(5)
    expect(percentOfSubtotalUsd(-50, 10)).toBe(0)
  })
})

describe('price drafts', () => {
  const rate = 40
  const fromUsd = (amountUsd: number) => amountUsd * rate
  const toUsd = (amount: number) => amount / rate

  it('uses 4 decimals for USD and 6 for other display currencies', () => {
    expect(cartPriceDecimals('USD')).toBe(4)
    expect(cartPriceDecimals('VES')).toBe(6)
  })

  it('converts USD to a trimmed draft in the display currency', () => {
    expect(usdToPriceDraft(1.25, fromUsd, 6)).toBe('50')
    expect(usdToPriceDraft(0.123456789, (v) => v, 4)).toBe('0.1235')
  })

  it('parses a draft back to USD with 4 decimals and clamps at zero', () => {
    expect(priceDraftToUsd('50', toUsd, 6)).toBe(1.25)
    expect(priceDraftToUsd('', toUsd, 6)).toBe(0)
    expect(priceDraftToUsd('1', (v) => v / 3, 6)).toBe(0.3333)
  })
})
