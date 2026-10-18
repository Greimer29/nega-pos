import { resolveSaleReturnRequests } from '#utils/sale_return_requests'
import { test } from '@japa/runner'

test.group('resolveSaleReturnRequests', () => {
  test('defaults to the remaining quantity of every line', ({ assert }) => {
    assert.deepEqual(
      resolveSaleReturnRequests([
        { id: 10, quantity: '5.000', returnedQuantity: '2.000' },
        { id: 11, quantity: '3.000', returnedQuantity: '0.000' },
      ]),
      [
        { lineId: 10, quantity: 3 },
        { lineId: 11, quantity: 3 },
      ]
    )
  })

  test('omits lines that have already been fully returned', ({ assert }) => {
    assert.deepEqual(
      resolveSaleReturnRequests([
        { id: '10', quantity: '2.000', returnedQuantity: '2.000' },
        { id: '11', quantity: '4.000', returnedQuantity: '1.000' },
      ]),
      [{ lineId: 11, quantity: 3 }]
    )
  })

  test('uses explicit return lines as requested without changing their order', ({ assert }) => {
    assert.deepEqual(
      resolveSaleReturnRequests(
        [
          { id: 10, quantity: '5.000', returnedQuantity: '0.000' },
          { id: 11, quantity: '3.000', returnedQuantity: '0.000' },
        ],
        [
          { line_id: 11, quantity: 1 },
          { line_id: 10, quantity: 2 },
        ]
      ),
      [
        { lineId: 11, quantity: 1 },
        { lineId: 10, quantity: 2 },
      ]
    )
  })

  test('treats an empty explicit list as a request for all remaining lines', ({ assert }) => {
    assert.deepEqual(
      resolveSaleReturnRequests([{ id: 10, quantity: 2, returnedQuantity: null }], []),
      [{ lineId: 10, quantity: 2 }]
    )
  })
})
