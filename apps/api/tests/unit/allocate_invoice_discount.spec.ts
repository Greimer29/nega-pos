import { test } from '@japa/runner'
import {
  allocateInvoiceDiscountToGrossLines,
  allocateInvoiceDiscountToSaleLines,
} from '#utils/allocate_invoice_discount'

test.group('allocateInvoiceDiscountToGrossLines', () => {
  test('keeps gross amounts when discount is zero', ({ assert }) => {
    assert.deepEqual(allocateInvoiceDiscountToGrossLines([20, 10], 0), [20, 10])
  })

  test('allocates invoice discount proportionally and preserves net total', ({ assert }) => {
    const nets = allocateInvoiceDiscountToGrossLines([20, 10], 6)
    const sum = nets.reduce((acc, value) => acc + value, 0)
    assert.equal(Number(sum.toFixed(4)), 24)
    assert.equal(nets[0], 16)
    assert.equal(nets[1], 8)
  })

  test('allocates across keyed sale lines', ({ assert }) => {
    const allocated = allocateInvoiceDiscountToSaleLines(
      [
        { key: 'a', grossUsd: 20, quantity: 2 },
        { key: 'b', grossUsd: 10, quantity: 2 },
      ],
      6
    )
    assert.equal(allocated[0]!.netUsd, 16)
    assert.equal(allocated[1]!.netUsd, 8)
  })
})
