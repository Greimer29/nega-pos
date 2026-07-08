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

export const INVENTORY_UNIT_OPTIONS = INVENTORY_UNITS.map((value) => ({
  value,
  label: INVENTORY_UNIT_LABELS[value],
}))

export function inventoryUnitLabel(unit: string) {
  return INVENTORY_UNIT_LABELS[unit as InventoryUnit] ?? unit
}

export function inventoryUnitAbrev(unit: string) {
  return INVENTORY_UNIT_LABELS[unit as InventoryUnit] ? unit : unit
}

/** UND, PAR, CAJ, ROL y SET solo admiten cantidades enteras; MTS y KG hasta 2 decimales. */
export function inventoryQuantityDecimals(unit: string): number {
  return unit === 'MTS' || unit === 'KG' ? 2 : 0
}

export function normalizeInventoryQuantity(value: number, unit: string): number {
  if (!Number.isFinite(value)) {
    return inventoryQuantityDecimals(unit) === 0 ? 1 : 0
  }

  if (inventoryQuantityDecimals(unit) === 0) {
    return Math.max(1, Math.round(value))
  }

  return Math.round(value * 100) / 100
}
