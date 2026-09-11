import { describe, expect, it } from 'vitest'
import { counterpartLabel } from '@/features/purchases/components/bi-currency-price'

const rates = { USD: 1, VES: 36 }

describe('counterpartLabel', () => {
  it('shows VES converted from the same base when display is USD', () => {
    expect(counterpartLabel(21.32, 'USD', rates, 'USD')).toBe('Bs 767,52')
  })

  it('shows USD converted from the same base when display is VES', () => {
    expect(counterpartLabel(21.32, 'VES', rates, 'USD')).toBe('$ 21,32')
  })
})
