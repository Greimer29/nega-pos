import { accumulatePeriodGross, computeSaleProductLeft } from '#utils/sale_period_gross'
import { test } from '@japa/runner'

test.group('computeSaleProductLeft', () => {
  test('uses line cost and subtracts invoice discount', ({ assert }) => {
    const result = computeSaleProductLeft({
      lines: [
        { unitPriceUsd: 10, costUsd: 4, quantity: 2, returnedQuantity: 0 },
        { unitPriceUsd: 5, costUsd: 2, quantity: 2, returnedQuantity: 0 },
      ],
      discountUsd: 6,
      totalUsd: 24,
      isCredit: false,
    })

    assert.equal(result.productLeftUsd, 12)
    assert.isTrue(result.hasLines)
    assert.isFalse(result.hasMissingCost)
  })

  test('ignores returned quantity', ({ assert }) => {
    const result = computeSaleProductLeft({
      lines: [{ unitPriceUsd: 20, costUsd: 8, quantity: 2, returnedQuantity: 1 }],
      discountUsd: 0,
      totalUsd: 20,
      isCredit: false,
    })

    assert.equal(result.productLeftUsd, 12)
  })

  test('sales without lines do not invent COGS', ({ assert }) => {
    const result = computeSaleProductLeft({
      lines: [],
      discountUsd: 0,
      totalUsd: 50,
      isCredit: false,
    })

    assert.equal(result.productLeftUsd, 0)
    assert.isFalse(result.hasLines)
  })

  test('null or zero cost flags missing cost and treats cost as 0', ({ assert }) => {
    const missing = computeSaleProductLeft({
      lines: [{ unitPriceUsd: 10, costUsd: null, quantity: 1, returnedQuantity: 0 }],
      discountUsd: 0,
      totalUsd: 10,
      isCredit: false,
    })
    const zero = computeSaleProductLeft({
      lines: [{ unitPriceUsd: 10, costUsd: 0, quantity: 1, returnedQuantity: 0 }],
      discountUsd: 0,
      totalUsd: 10,
      isCredit: false,
    })

    assert.equal(missing.productLeftUsd, 10)
    assert.isTrue(missing.hasMissingCost)
    assert.equal(zero.productLeftUsd, 10)
    assert.isTrue(zero.hasMissingCost)
  })
})

test.group('accumulatePeriodGross', () => {
  test('includes credit sales in product left and sold, not as a separate skip', ({ assert }) => {
    const result = accumulatePeriodGross([
      {
        lines: [{ unitPriceUsd: 100, costUsd: 40, quantity: 1, returnedQuantity: 0 }],
        discountUsd: 0,
        totalUsd: 100,
        isCredit: true,
      },
      {
        lines: [{ unitPriceUsd: 50, costUsd: 20, quantity: 1, returnedQuantity: 0 }],
        discountUsd: 0,
        totalUsd: 50,
        isCredit: false,
      },
    ])

    assert.equal(result.soldUsd, 150)
    assert.equal(result.soldOnCreditUsd, 100)
    assert.equal(result.productLeftUsd, 90)
    assert.equal(result.salesWithoutLinesCount, 0)
    assert.equal(result.salesWithoutCostCount, 0)
  })

  test('counts invoices without lines and does not add them to product left', ({ assert }) => {
    const result = accumulatePeriodGross([
      {
        lines: [],
        discountUsd: 0,
        totalUsd: 80,
        isCredit: false,
      },
    ])

    assert.equal(result.soldUsd, 80)
    assert.equal(result.productLeftUsd, 0)
    assert.equal(result.salesWithoutLinesCount, 1)
  })
})
