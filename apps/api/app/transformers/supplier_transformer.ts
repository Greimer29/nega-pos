import type Supplier from '#models/supplier'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class SupplierTransformer extends BaseTransformer<Supplier> {
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
      ...(saldoPendienteUsd !== undefined ? { saldoPendienteUsd } : {}),
      ...(tieneSaldoVencido !== undefined ? { tieneSaldoVencido } : {}),
    }
  }
}

export function serializeSupplier(supplier: Supplier) {
  return new SupplierTransformer(supplier).toObject()
}
