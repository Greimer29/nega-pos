import { Exception } from '@adonisjs/core/exceptions'

export const INVENTORY_ADJUSTMENT_MODES = ['CARGO', 'DESCARGO', 'AJUSTE'] as const

export type InventoryAdjustmentMode = (typeof INVENTORY_ADJUSTMENT_MODES)[number]

export type ManualMovementType = 'MANUAL_CARGO' | 'MANUAL_DESCARGO' | 'MANUAL_ADJUSTMENT'

export type ResolvedInventoryAdjustment = {
  delta: number
  movementType: ManualMovementType
}

export function resolveInventoryAdjustment(
  mode: InventoryAdjustmentMode,
  quantity: number,
  currentStock: number
): ResolvedInventoryAdjustment {
  if (mode === 'CARGO') {
    if (quantity <= 0) {
      throw new Exception('La cantidad del cargo debe ser mayor a cero', {
        status: 422,
        code: 'INVALID_ADJUSTMENT_QUANTITY',
      })
    }
    return { delta: quantity, movementType: 'MANUAL_CARGO' }
  }

  if (mode === 'DESCARGO') {
    if (quantity <= 0) {
      throw new Exception('La cantidad del descargo debe ser mayor a cero', {
        status: 422,
        code: 'INVALID_ADJUSTMENT_QUANTITY',
      })
    }
    return { delta: -quantity, movementType: 'MANUAL_DESCARGO' }
  }

  if (quantity < 0) {
    throw new Exception('El stock actual no puede ser negativo', {
      status: 422,
      code: 'INVALID_ADJUSTMENT_QUANTITY',
    })
  }

  const delta = quantity - currentStock

  if (delta === 0) {
    throw new Exception('El stock ya coincide con la cantidad indicada', {
      status: 422,
      code: 'ADJUSTMENT_NO_CHANGE',
    })
  }

  return { delta, movementType: 'MANUAL_ADJUSTMENT' }
}
