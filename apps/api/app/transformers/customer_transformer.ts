import type Customer from '#models/customer'
import type Order from '#models/order'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class CustomerTransformer extends BaseTransformer<Customer> {
  toObject() {
    const saldoPendienteUsd =
      this.resource.$extras.saldoPendienteUsd !== undefined
        ? String(this.resource.$extras.saldoPendienteUsd)
        : undefined
    const tieneSaldoVencido =
      this.resource.$extras.tieneSaldoVencido !== undefined
        ? Boolean(this.resource.$extras.tieneSaldoVencido)
        : undefined

    return {
      ...this.pick(this.resource, [
        'id',
        'name',
        'phone',
        'email',
        'type',
        'document',
        'address',
        'notes',
        'creditDays',
        'imagePath',
        'createdAt',
        'updatedAt',
      ]),
      active: Boolean(this.resource.active),
      ...(saldoPendienteUsd !== undefined ? { saldoPendienteUsd } : {}),
      ...(tieneSaldoVencido !== undefined ? { tieneSaldoVencido } : {}),
    }
  }
}

export function serializeCustomer(customer: Customer) {
  return new CustomerTransformer(customer).toObject()
}

export function serializeCustomerResumen(customer: Customer) {
  return {
    id: customer.id,
    name: customer.name,
    type: customer.type,
    active: Boolean(customer.active),
    creditDays: customer.creditDays,
    document: customer.document,
  }
}

export function serializeOrderResumen(order: Order) {
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    modality: order.modality,
    description: order.description,
    totalQuantity: order.totalQuantity,
    orderDate: order.orderDate,
    estimatedDeliveryDate: order.estimatedDeliveryDate,
    totalPrice: order.totalPrice,
  }
}

export function serializeCustomerConOrders(customer: Customer) {
  return {
    ...serializeCustomer(customer),
    orders: customer.orders.map((order) => serializeOrderResumen(order)),
  }
}
