import { calculateProductReturnStockQuantity } from '#utils/sale_return_stock'
import { test } from '@japa/runner'

test.group('calculateProductReturnStockQuantity', () => {
  test('returns the requested quantity when no stock was previously reversed', ({ assert }) => {
    assert.equal(calculateProductReturnStockQuantity(['-5.000', -3], [], 2), 2)
  })

  test('caps return quantity at the sold quantity that remains unreversed', ({ assert }) => {
    assert.equal(calculateProductReturnStockQuantity([-5, -3], [2, '1.000'], 10), 5)
  })

  test('returns zero when previous reversals cover all stock sold', ({ assert }) => {
    assert.equal(calculateProductReturnStockQuantity([-2, -3], [4, 1], 2), 0)
  })

  test('does not produce a negative quantity for a non-positive request', ({ assert }) => {
    assert.equal(calculateProductReturnStockQuantity([-5], [], 0), 0)
    assert.equal(calculateProductReturnStockQuantity([-5], [], -1), 0)
  })
})
