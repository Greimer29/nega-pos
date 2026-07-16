import { describe, expect, it } from 'vitest'
import {
  buildRatesMap,
  fromBase,
  toBase,
} from '@/features/currencies/utils/convert-currency'

describe('convert-currency base hub', () => {
  const currencies = [
    { code: 'XAU', ratePerUsd: '1.0000' },
    { code: 'USD', ratePerUsd: '100.0000' },
    { code: 'VES', ratePerUsd: '4000.0000' },
  ]

  it('builds rates with XAU = 1', () => {
    expect(buildRatesMap(currencies, 'XAU')).toEqual({
      XAU: 1,
      USD: 100,
      VES: 4000,
    })
  })

  it('converts to and from base XAU', () => {
    const rates = buildRatesMap(currencies, 'XAU')
    expect(toBase(100, 'USD', rates, 'XAU')).toBe(1)
    expect(toBase(4000, 'VES', rates, 'XAU')).toBe(1)
    expect(fromBase(1, 'USD', rates, 'XAU')).toBe(100)
    expect(fromBase(0.5, 'VES', rates, 'XAU')).toBe(2000)
  })
})
