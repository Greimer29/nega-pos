import type Customer from '#models/customer'
import type Order from '#models/order'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class CustomerTransformer extends BaseTransformer<Customer> {
  toObject() {
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
