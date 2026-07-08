import OrderNoCancelableException from '#exceptions/pedido_no_cancelable_exception'
import TransicionInvalidaException from '#exceptions/transicion_invalida_exception'
import type Order from '#models/order'

export type OrderEstado =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED'

export type TransicionWarning = {
  code: string
  message: string
}

export type TransicionResult = {
  warnings: TransicionWarning[]
}

const TRANSICIONES_PERMITIDAS: Record<OrderEstado, OrderEstado[]> = {
  DRAFT: ['CONFIRMED', 'DELIVERED', 'CANCELLED'],
  CONFIRMED: ['IN_PRODUCTION', 'CANCELLED'],
  IN_PRODUCTION: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
  RETURNED: [],
}

export function esTransicionPermitida(
  statusActual: OrderEstado,
  nuevoEstado: OrderEstado
): boolean {
  return TRANSICIONES_PERMITIDAS[statusActual].includes(nuevoEstado)
}

export function assertTransicionPermitida(statusActual: OrderEstado, nuevoEstado: OrderEstado) {
  if (statusActual === 'DELIVERED' && nuevoEstado === 'CANCELLED') {
    throw new OrderNoCancelableException()
  }

  if (!esTransicionPermitida(statusActual, nuevoEstado)) {
    throw new TransicionInvalidaException(statusActual, nuevoEstado)
  }
}

export function validarConfirmacion(order: Order) {
  const hasCustomer = Boolean(order.customerId)
  const hasGuest = Boolean(order.guestName?.trim())

  if (!hasCustomer && !hasGuest) {
    throw new TransicionInvalidaException(order.status, 'CONFIRMED')
  }

  if (!order.description?.trim()) {
    throw new TransicionInvalidaException(order.status, 'CONFIRMED')
  }

  if (order.totalQuantity < 1) {
    throw new TransicionInvalidaException(order.status, 'CONFIRMED')
  }
}

/**
 * Transiciones de status (validación estructural; stock en OrderService Sprint 4).
 */
export function resolverTransicion(order: Order, nuevoEstado: OrderEstado): TransicionResult {
  const statusActual = order.status as OrderEstado

  assertTransicionPermitida(statusActual, nuevoEstado)

  if (nuevoEstado === 'CONFIRMED') {
    validarConfirmacion(order)
  }

  if (statusActual === 'DRAFT' && nuevoEstado === 'DELIVERED') {
    validarConfirmacion(order)
  }

  return { warnings: [] }
}
