import { describe, expect, it } from 'vitest'
import type { Order } from '@/features/orders/types'
import {
  availableOrderTransitions,
  buildTransitionPayload,
  orderHeaderSchema,
  toOrderHeaderPayload,
  toOrderHeaderValues,
  validateCreditPayment,
} from './order-detail-form'

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    code: 'P-0001',
    customerId: 7,
    guestName: null,
    modalidad: 'WHITE_LABEL',
    description: 'Camisas',
    totalQuantity: 10,
    dateOrder: '2026-10-20',
    estimatedDeliveryDate: null,
    status: 'DRAFT',
    totalPrice: '120.0000',
    paymentType: null,
    creditDueDate: null,
    amountPaidUsd: null,
    balanceUsd: null,
    confirmedAt: null,
    notes: null,
    returnedAt: null,
    tieneReferencia: false,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
    customer: { id: 7, name: 'Cliente', type: 'OTHER', active: true, creditDays: 15 },
    ...overrides,
  }
}

describe('buildTransitionPayload', () => {
  it('sends payment type only when a draft is confirmed or delivered', () => {
    expect(buildTransitionPayload('CONFIRMED', 'DRAFT', 'CREDIT')).toEqual({
      new_status: 'CONFIRMED',
      payment_type: 'CREDIT',
    })
    expect(buildTransitionPayload('DELIVERED', 'DRAFT', 'CASH')).toEqual({
      new_status: 'DELIVERED',
      payment_type: 'CASH',
    })
    expect(buildTransitionPayload('CANCELLED', 'DRAFT', 'CASH')).toEqual({
      new_status: 'CANCELLED',
    })
    expect(buildTransitionPayload('DELIVERED', 'IN_PRODUCTION', 'CASH')).toEqual({
      new_status: 'DELIVERED',
    })
  })

  it('adds force when requested', () => {
    expect(buildTransitionPayload('IN_PRODUCTION', 'CONFIRMED', 'CASH', true)).toEqual({
      new_status: 'IN_PRODUCTION',
      force: true,
    })
  })
})

describe('validateCreditPayment', () => {
  it('allows cash and credit for customers with credit days', () => {
    expect(validateCreditPayment('CASH', order({ customerId: null }))).toBeNull()
    expect(validateCreditPayment('CREDIT', order())).toBeNull()
  })

  it('rejects credit for guests or customers without credit days', () => {
    expect(validateCreditPayment('CREDIT', order({ customerId: null }))).toMatch(
      /clientes registrados/
    )
    expect(
      validateCreditPayment(
        'CREDIT',
        order({ customer: { id: 7, name: 'C', type: 'OTHER', active: true, creditDays: 0 } })
      )
    ).toMatch(/días de crédito/)
  })
})

describe('availableOrderTransitions', () => {
  it('hides invoice-and-deliver for drafts without catalog lines', () => {
    expect(availableOrderTransitions('DRAFT', 0).map((t) => t.destino)).toEqual([
      'CONFIRMED',
      'CANCELLED',
    ])
    expect(availableOrderTransitions('DRAFT', 2).map((t) => t.destino)).toEqual([
      'CONFIRMED',
      'DELIVERED',
      'CANCELLED',
    ])
    expect(availableOrderTransitions('IN_PRODUCTION', 0).map((t) => t.destino)).toEqual([
      'DELIVERED',
      'CANCELLED',
    ])
  })
})

describe('order header form', () => {
  it('maps an order to form values for registered and guest clients', () => {
    expect(toOrderHeaderValues(order())).toMatchObject({
      client_mode: 'registered',
      customer_id: 7,
      guest_name: '',
      total_price: '120.0000',
      date_entrega_estimada: '',
      notes: '',
    })
    expect(toOrderHeaderValues(order({ customerId: null, guestName: 'Ana' }))).toMatchObject({
      client_mode: 'guest',
      customer_id: '',
      guest_name: 'Ana',
    })
  })

  it('requires a customer or a guest name', () => {
    const base = toOrderHeaderValues(order())
    expect(orderHeaderSchema.safeParse({ ...base, customer_id: '' }).success).toBe(false)
    expect(
      orderHeaderSchema.safeParse({ ...base, client_mode: 'guest', guest_name: ' ' }).success
    ).toBe(false)
    expect(orderHeaderSchema.safeParse(base).success).toBe(true)
  })

  it('builds the payload with trimmed optional fields', () => {
    const values = orderHeaderSchema.parse({
      ...toOrderHeaderValues(order()),
      description: '  Camisas  ',
      total_price: '',
      notes: '  ',
    })
    expect(toOrderHeaderPayload(values)).toEqual({
      modalidad: 'WHITE_LABEL',
      description: 'Camisas',
      quantity_total: 10,
      date_order: '2026-10-20',
      date_entrega_estimada: undefined,
      total_price: undefined,
      notes: undefined,
      customer_id: 7,
    })

    const guest = orderHeaderSchema.parse({
      ...toOrderHeaderValues(order({ customerId: null, guestName: ' Ana ' })),
      total_price: '50',
    })
    expect(toOrderHeaderPayload(guest)).toMatchObject({ guest_name: 'Ana', total_price: 50 })
  })
})
