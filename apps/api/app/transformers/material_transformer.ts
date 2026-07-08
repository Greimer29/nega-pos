import type Material from '#models/material'
import type InventoryMovement from '#models/inventory_movement'
import { BaseTransformer } from '@adonisjs/core/transformers'

export type MaterialExtra = {
  stockActual?: number
  stockComprometido?: number
  movimientos?: ReturnType<typeof serializeMovimiento>[]
  purchasedQty?: number
  usedQty?: number
  flowQty?: number
  rating?: number
}

export default class MaterialTransformer extends BaseTransformer<Material> {
  toObject(extra: MaterialExtra = {}) {
    return {
      ...this.pick(this.resource, [
        'id',
        'code',
        'name',
        'description',
        'category',
        'unit',
        'minimumStock',
        'location',
        'defaultSupplierId',
        'lastPurchasePrice',
        'lastPurchasePriceUsd',
        'lastPurchaseDate',
        'previousPurchasePriceUsd',
        'imagePath',
        'createdAt',
        'updatedAt',
      ]),
      active: Boolean(this.resource.active),
      ...(extra.stockActual !== undefined ? { stockActual: extra.stockActual } : {}),
      ...(extra.stockComprometido !== undefined
        ? { stockComprometido: extra.stockComprometido }
        : {}),
      ...(extra.movimientos ? { movimientos: extra.movimientos } : {}),
      ...(extra.purchasedQty !== undefined ? { purchasedQty: extra.purchasedQty } : {}),
      ...(extra.usedQty !== undefined ? { usedQty: extra.usedQty } : {}),
      ...(extra.flowQty !== undefined ? { flowQty: extra.flowQty } : {}),
      ...(extra.rating !== undefined ? { rating: extra.rating } : {}),
    }
  }
}

function serializeMovimiento(movimiento: InventoryMovement) {
  return {
    id: Number(movimiento.id),
    type: movimiento.type,
    quantity: movimiento.quantity,
    note: movimiento.note,
    createdAt: movimiento.createdAt,
  }
}

export function serializeMaterial(material: Material, extra: MaterialExtra = {}) {
  return new MaterialTransformer(material).toObject(extra)
}

export function serializeMovimientos(movimientos: InventoryMovement[]) {
  return movimientos.map(serializeMovimiento)
}
