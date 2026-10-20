import TransicionInvalidaException from '#exceptions/transicion_invalida_exception'
import type Sale from '#models/sale'

export type SaleOrderStatus = 'PENDING' | 'IN_PROCESS' | 'DELIVERED'

const SALE_ORDER_TRANSITIONS: Record<SaleOrderStatus, SaleOrderStatus[]> = {
  PENDING: ['IN_PROCESS', 'DELIVERED'],
  IN_PROCESS: ['DELIVERED'],
  DELIVERED: [],
}

export function isSaleOrderTransitionAllowed(
  current: SaleOrderStatus,
  next: SaleOrderStatus
): boolean {
  return (SALE_ORDER_TRANSITIONS[current] ?? []).includes(next)
}

/** Only completed ORDER-mode sales move through the order status flow. */
export function assertSaleOrderTransition(
  sale: Pick<Sale, 'status' | 'billingMode' | 'orderStatus'>,
  next: SaleOrderStatus
) {
  if (sale.status !== 'COMPLETED') {
    throw new TransicionInvalidaException(sale.status, next)
  }

  if (sale.billingMode !== 'ORDER') {
    throw new TransicionInvalidaException(sale.orderStatus, next)
  }

  const current = sale.orderStatus as SaleOrderStatus
  if (!isSaleOrderTransitionAllowed(current, next)) {
    throw new TransicionInvalidaException(current, next)
  }
}
