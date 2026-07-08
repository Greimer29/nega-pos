export const INVENTORY_ADJUSTMENT_MODES = ['CARGO', 'DESCARGO', 'AJUSTE'] as const

export type InventoryAdjustmentMode = (typeof INVENTORY_ADJUSTMENT_MODES)[number]

export const INVENTORY_ADJUSTMENT_MODE_LABELS: Record<InventoryAdjustmentMode, string> = {
  CARGO: 'Cargo',
  DESCARGO: 'Descargo',
  AJUSTE: 'Ajuste',
}

export const INVENTORY_ADJUSTMENT_MODE_DESCRIPTIONS: Record<InventoryAdjustmentMode, string> = {
  CARGO: 'Suma la cantidad indicada al stock actual.',
  DESCARGO: 'Resta la cantidad indicada del stock actual.',
  AJUSTE: 'Define el stock total actual (reemplaza la cantidad anterior).',
}

export function inventoryAdjustmentQuantityLabel(mode: InventoryAdjustmentMode) {
  if (mode === 'AJUSTE') {
    return 'Stock actual (nuevo total)'
  }
  if (mode === 'CARGO') {
    return 'Cantidad a sumar'
  }
  return 'Cantidad a restar'
}

export function inventoryAdjustmentSubmitLabel(mode: InventoryAdjustmentMode) {
  if (mode === 'AJUSTE') {
    return 'Registrar ajuste'
  }
  if (mode === 'CARGO') {
    return 'Registrar cargo'
  }
  return 'Registrar descargo'
}
