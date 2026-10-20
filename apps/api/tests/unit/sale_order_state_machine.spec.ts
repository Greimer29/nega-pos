import TransicionInvalidaException from '#exceptions/transicion_invalida_exception'
import {
  assertSaleOrderTransition,
  isSaleOrderTransitionAllowed,
  type SaleOrderStatus,
} from '#services/sale_order_state_machine'
import { test } from '@japa/runner'

function orderSale(orderStatus: SaleOrderStatus, status = 'COMPLETED') {
  return { status, billingMode: 'ORDER', orderStatus }
}

function transitionError(fn: () => void) {
  try {
    fn()
  } catch (error) {
    return error as TransicionInvalidaException
  }
  return null
}

test.group('sale order state machine', () => {
  test('allows PENDING to IN_PROCESS or DELIVERED and IN_PROCESS to DELIVERED', ({ assert }) => {
    assert.isTrue(isSaleOrderTransitionAllowed('PENDING', 'IN_PROCESS'))
    assert.isTrue(isSaleOrderTransitionAllowed('PENDING', 'DELIVERED'))
    assert.isTrue(isSaleOrderTransitionAllowed('IN_PROCESS', 'DELIVERED'))
  })

  test('rejects staying in place, going back or leaving DELIVERED', ({ assert }) => {
    assert.isFalse(isSaleOrderTransitionAllowed('PENDING', 'PENDING'))
    assert.isFalse(isSaleOrderTransitionAllowed('IN_PROCESS', 'PENDING'))
    assert.isFalse(isSaleOrderTransitionAllowed('IN_PROCESS', 'IN_PROCESS'))
    assert.isFalse(isSaleOrderTransitionAllowed('DELIVERED', 'PENDING'))
    assert.isFalse(isSaleOrderTransitionAllowed('DELIVERED', 'IN_PROCESS'))
    assert.isFalse(isSaleOrderTransitionAllowed('DELIVERED', 'DELIVERED'))
  })

  test('accepts an allowed transition on a completed ORDER sale', ({ assert }) => {
    assert.doesNotThrow(() => assertSaleOrderTransition(orderSale('PENDING'), 'IN_PROCESS'))
    assert.doesNotThrow(() => assertSaleOrderTransition(orderSale('IN_PROCESS'), 'DELIVERED'))
  })

  test('rejects sales that are not completed using the sale status in the message', ({
    assert,
  }) => {
    for (const status of ['DRAFT', 'RETURNED']) {
      const error = transitionError(() =>
        assertSaleOrderTransition(orderSale('PENDING', status), 'IN_PROCESS')
      )
      assert.instanceOf(error, TransicionInvalidaException)
      assert.equal(error!.message, `No se puede pasar de ${status} a IN_PROCESS`)
    }
  })

  test('rejects FAST sales using the order status in the message', ({ assert }) => {
    const error = transitionError(() =>
      assertSaleOrderTransition(
        { status: 'COMPLETED', billingMode: 'FAST', orderStatus: 'DELIVERED' },
        'IN_PROCESS'
      )
    )
    assert.instanceOf(error, TransicionInvalidaException)
    assert.equal(error!.message, 'No se puede pasar de DELIVERED a IN_PROCESS')
  })

  test('rejects a disallowed move on an ORDER sale', ({ assert }) => {
    const error = transitionError(() =>
      assertSaleOrderTransition(orderSale('DELIVERED'), 'IN_PROCESS')
    )
    assert.instanceOf(error, TransicionInvalidaException)
    assert.equal(error!.message, 'No se puede pasar de DELIVERED a IN_PROCESS')
  })
})
