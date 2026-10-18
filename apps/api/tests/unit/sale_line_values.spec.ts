import { calculateSaleLineAmounts, normalizeSaleLineKitchenNote } from '#utils/sale_line_values'
import { test } from '@japa/runner'

test.group('calculateSaleLineAmounts', () => {
  test('calculates and formats a line subtotal to four decimals', ({ assert }) => {
    const amounts = calculateSaleLineAmounts(3, 1.23456)
    assert.closeTo(amounts.subtotal, 3.70368, 0.0000001)
    assert.equal(amounts.unitPriceUsd, '1.2346')
    assert.equal(amounts.subtotalUsd, '3.7037')
  })

  test('preserves the unrounded subtotal for invoice aggregation', ({ assert }) => {
    const lines = [calculateSaleLineAmounts(1, 0.33335), calculateSaleLineAmounts(1, 0.33335)]

    assert.equal(
      lines.reduce((sum, line) => sum + line.subtotal, 0),
      0.6667
    )
    assert.deepEqual(
      lines.map((line) => line.subtotalUsd),
      ['0.3333', '0.3333']
    )
  })

  test('supports fractional quantities', ({ assert }) => {
    assert.deepEqual(calculateSaleLineAmounts(1.25, 8), {
      subtotal: 10,
      unitPriceUsd: '8.0000',
      subtotalUsd: '10.0000',
    })
  })
})

test.group('normalizeSaleLineKitchenNote', () => {
  test('trims non-empty notes', ({ assert }) => {
    assert.equal(normalizeSaleLineKitchenNote('  Sin cebolla  '), 'Sin cebolla')
  })

  test('returns null for missing or whitespace-only notes', ({ assert }) => {
    assert.isNull(normalizeSaleLineKitchenNote(undefined))
    assert.isNull(normalizeSaleLineKitchenNote(null))
    assert.isNull(normalizeSaleLineKitchenNote('  \n  '))
  })
})
