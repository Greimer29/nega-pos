import Order from '#models/order'
import OrderNoCancelableException from '#exceptions/pedido_no_cancelable_exception'
import TransicionInvalidaException from '#exceptions/transicion_invalida_exception'
import {
  assertTransicionPermitida,
  esTransicionPermitida,
  resolverTransicion,
} from '#services/order_state_machine'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

function buildOrder(overrides: Partial<Order> = {}) {
  const order = new Order()
  order.customerId = 1
  order.description = 'Camisetas polo'
  order.totalQuantity = 100
  order.status = 'DRAFT'
  order.code = 'PED-202605-0001'
  order.modality = 'WHITE_LABEL'
  order.orderDate = DateTime.fromISO('2026-05-01')

  Object.assign(order, overrides)
  return order
}

test.group('OrderStateMachine', () => {
  test('allows DRAFT to CONFIRMED, DELIVERED and CANCELLED', ({ assert }) => {
    assert.isTrue(esTransicionPermitida('DRAFT', 'CONFIRMED'))
    assert.isTrue(esTransicionPermitida('DRAFT', 'DELIVERED'))
    assert.isTrue(esTransicionPermitida('DRAFT', 'CANCELLED'))
    assert.isFalse(esTransicionPermitida('DRAFT', 'IN_PRODUCTION'))
  })

  test('allows full happy path', ({ assert }) => {
    assert.isTrue(esTransicionPermitida('CONFIRMED', 'IN_PRODUCTION'))
    assert.isTrue(esTransicionPermitida('IN_PRODUCTION', 'DELIVERED'))
  })

  test('rejects invalid transition with exception', ({ assert }) => {
    assert.throws(
      () => assertTransicionPermitida('DRAFT', 'IN_PRODUCTION'),
      TransicionInvalidaException
    )
  })

  test('rejects cancel on DELIVERED', ({ assert }) => {
    assert.throws(
      () => assertTransicionPermitida('DELIVERED', 'CANCELLED'),
      OrderNoCancelableException
    )
  })

  test('resolverTransicion returns empty warnings in Sprint 3', ({ assert }) => {
    const order = buildOrder({ status: 'CONFIRMED' })
    const result = resolverTransicion(order, 'IN_PRODUCTION')

    assert.deepEqual(result.warnings, [])
  })

  test('resolverTransicion accepts guest name on direct delivery', ({ assert }) => {
    const order = buildOrder({ customerId: null, guestName: 'Walk-in' })
    const result = resolverTransicion(order, 'DELIVERED')

    assert.deepEqual(result.warnings, [])
  })
})
