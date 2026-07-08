import type Customer from '#models/customer'
import type Order from '#models/order'
import { serializeCustomerResumen } from '#transformers/customer_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'

export type OrderExtra = {
  materials?: unknown[]
  lines?: unknown[]
  budget?: unknown
  warnings?: { code: string; message: string }[]
}

function serializeCustomerEmbedded(customer: Customer) {
  return serializeCustomerResumen(customer)
}

export default class OrderTransformer extends BaseTransformer<Order> {
  toObject(extra: OrderExtra = {}) {
    return {
      id: Number(this.resource.id),
      code: this.resource.code,
      customerId: this.resource.customerId ? Number(this.resource.customerId) : null,
      guestName: this.resource.guestName,
      modality: this.resource.modality,
      description: this.resource.description,
      totalQuantity: this.resource.totalQuantity,
      orderDate: this.resource.orderDate.toISODate(),
      estimatedDeliveryDate: this.resource.estimatedDeliveryDate?.toISODate() ?? null,
      status: this.resource.status,
      paymentType: this.resource.paymentType,
      confirmedAt: this.resource.confirmedAt,
      creditDueDate: this.resource.creditDueDate?.toISODate() ?? null,
      amountPaidUsd: this.resource.amountPaidUsd,
      balanceUsd: this.resource.balanceUsd,
      totalPrice: this.resource.totalPrice,
      notes: this.resource.notes,
      returnedAt: this.resource.returnedAt,
      tieneReferencia: Boolean(this.resource.referenceFile),
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt,
      ...(this.resource.customer
        ? { customer: serializeCustomerEmbedded(this.resource.customer) }
        : {}),
      ...(extra.materials !== undefined ? { materials: extra.materials } : {}),
      ...(extra.lines !== undefined ? { lines: extra.lines } : {}),
      ...(extra.budget !== undefined ? { budget: extra.budget } : {}),
      ...(extra.warnings !== undefined ? { warnings: extra.warnings } : {}),
    }
  }
}

export function serializeOrder(order: Order, extra: OrderExtra = {}) {
  return new OrderTransformer(order).toObject(extra)
}

export function serializeOrderListItem(order: Order) {
  return {
    id: Number(order.id),
    code: order.code,
    customerId: order.customerId ? Number(order.customerId) : null,
    guestName: order.guestName,
    modality: order.modality,
    description: order.description,
    totalQuantity: order.totalQuantity,
    orderDate: order.orderDate.toISODate(),
    estimatedDeliveryDate: order.estimatedDeliveryDate?.toISODate() ?? null,
    status: order.status,
    paymentType: order.paymentType,
    confirmedAt: order.confirmedAt,
    creditDueDate: order.creditDueDate?.toISODate() ?? null,
    amountPaidUsd: order.amountPaidUsd,
    balanceUsd: order.balanceUsd,
    totalPrice: order.totalPrice,
    ...(order.customer ? { customer: serializeCustomerEmbedded(order.customer) } : {}),
  }
}
