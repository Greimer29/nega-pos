import { computeSaleOriginalReturnedNet } from '#utils/sale_original_returned_net'
import { test } from '@japa/runner'

test.group('computeSaleOriginalReturnedNet', () => {
  test('without returns original equals remaining', ({ assert }) => {
    const result = computeSaleOriginalReturnedNet({
      lines: [{ quantity: 2, returnedQuantity: 0, unitPriceUsd: 10 }],
      remainingTotalUsd: 20,
      remainingDiscountUsd: 0,
    })

    assert.equal(result.originalNetUsd, 20)
    assert.equal(result.remainingNetUsd, 20)
    assert.equal(result.returnedNetUsd, 0)
  })

  test('full return uses payment snapshot as original billed net', ({ assert }) => {
    const result = computeSaleOriginalReturnedNet({
      lines: [{ quantity: 1, returnedQuantity: 1, unitPriceUsd: 25 }],
      remainingTotalUsd: 0,
      remainingDiscountUsd: 0,
      originalPaymentsUsd: 25,
    })

    assert.equal(result.originalNetUsd, 25)
    assert.equal(result.remainingNetUsd, 0)
    assert.equal(result.returnedNetUsd, 25)
  })

  test('full return without payments uses line gross', ({ assert }) => {
    const result = computeSaleOriginalReturnedNet({
      lines: [{ quantity: 1, returnedQuantity: 1, unitPriceUsd: 20 }],
      remainingTotalUsd: 0,
      remainingDiscountUsd: 0,
    })

    assert.equal(result.originalNetUsd, 20)
    assert.equal(result.returnedNetUsd, 20)
  })

  test('partial return keeps remaining net and returned remainder', ({ assert }) => {
    const result = computeSaleOriginalReturnedNet({
      lines: [{ quantity: 2, returnedQuantity: 1, unitPriceUsd: 12 }],
      remainingTotalUsd: 12,
      remainingDiscountUsd: 0,
    })

    assert.equal(result.originalNetUsd, 24)
    assert.equal(result.remainingNetUsd, 12)
    assert.equal(result.returnedNetUsd, 12)
  })
})
