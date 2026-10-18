import { calculateSaleReturnAmounts } from '#utils/sale_return_amounts'
import { test } from '@japa/runner'

test.group('calculateSaleReturnAmounts', () => {
  test('recalculates a partial cash return with a proportional invoice discount', ({ assert }) => {
    const amounts = calculateSaleReturnAmounts({
      lines: [
        { quantity: 2, returnedQuantity: 1, unitPriceUsd: 10 },
        { quantity: 1, returnedQuantity: 0, unitPriceUsd: 10 },
      ],
      discountUsd: '3.0000',
      totalUsd: '27.0000',
      paymentType: 'CASH',
      amountPaidUsd: '27.0000',
    })

    assert.deepEqual(amounts, {
      discountUsd: '2.0000',
      totalUsd: '18.0000',
      amountPaidUsd: '18.0000',
      balanceUsd: '0.0000',
    })
  })

  test('keeps paid credit unchanged and recalculates the remaining balance', ({ assert }) => {
    const amounts = calculateSaleReturnAmounts({
      lines: [{ quantity: 2, returnedQuantity: 1, unitPriceUsd: 10 }],
      discountUsd: 0,
      totalUsd: 20,
      paymentType: 'CREDIT',
      amountPaidUsd: '6.0000',
    })

    assert.deepEqual(amounts, {
      discountUsd: '0.0000',
      totalUsd: '10.0000',
      amountPaidUsd: '6.0000',
      balanceUsd: '4.0000',
    })
  })

  test('clears discount and balance after a full cash return', ({ assert }) => {
    const amounts = calculateSaleReturnAmounts({
      lines: [{ quantity: 1, returnedQuantity: 1, unitPriceUsd: 25 }],
      discountUsd: 5,
      totalUsd: 20,
      paymentType: 'CASH',
      amountPaidUsd: '20.0000',
    })

    assert.deepEqual(amounts, {
      discountUsd: '0.0000',
      totalUsd: '0.0000',
      amountPaidUsd: '0.0000',
      balanceUsd: '0.0000',
    })
  })

  test('does not create a negative credit balance when payments exceed the new total', ({
    assert,
  }) => {
    const amounts = calculateSaleReturnAmounts({
      lines: [{ quantity: 1, returnedQuantity: 0, unitPriceUsd: 10 }],
      discountUsd: 0,
      totalUsd: 10,
      paymentType: 'CREDIT',
      amountPaidUsd: '15.0000',
    })

    assert.equal(amounts.balanceUsd, '0.0000')
  })
})
