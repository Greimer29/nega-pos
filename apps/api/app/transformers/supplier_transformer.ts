import type Supplier from '#models/supplier'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class SupplierTransformer extends BaseTransformer<Supplier> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'name',
        'rif',
        'phone',
        'email',
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

export function serializeSupplier(supplier: Supplier) {
  return new SupplierTransformer(supplier).toObject()
}
