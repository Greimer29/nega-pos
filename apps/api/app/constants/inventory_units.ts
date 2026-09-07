export const INVENTORY_UNITS = ['UND', 'PAR', 'CAJ', 'ROL', 'SET', 'MTS', 'KG'] as const

export type InventoryUnit = (typeof INVENTORY_UNITS)[number]

export const INVENTORY_UNIT_LABELS: Record<InventoryUnit, string> = {
  UND: 'Unidad',
  PAR: 'Par',
  CAJ: 'Caja',
  ROL: 'Rollo',
  SET: 'Juego',
  MTS: 'Metros',
  KG: 'Kilogramo',
}

/** UND, PAR, CAJ, ROL y SET solo admiten cantidades enteras; MTS y KG hasta 2 decimales. */
export function inventoryQuantityDecimals(unit: string): number {
  return unit === 'MTS' || unit === 'KG' ? 2 : 0
}

export function normalizeInventoryQuantity(value: number, unit: string): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  if (inventoryQuantityDecimals(unit) === 0) {
    return Math.round(value)
  }

  return Math.round(value * 100) / 100
}

/** Persistencia decimal en columnas de stock (hasta 3 dígitos fraccionales en DB). */
export function formatInventoryQuantityForStorage(value: number, unit: string): string {
  return normalizeInventoryQuantity(value, unit).toFixed(3)
}
