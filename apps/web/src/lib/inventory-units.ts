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

export function isIntegerInventoryUnit(unit: string): boolean {
  return inventoryQuantityDecimals(unit) === 0
}

/** Paso de input HTML coherente con la unidad. */
export function inventoryQuantityStep(unit: string): number {
  return inventoryQuantityDecimals(unit) === 0 ? 1 : 0.01
}

/** Mínimo típico al vender/cargar (>0). */
export function inventoryQuantityMinPositive(unit: string): number {
  return inventoryQuantityDecimals(unit) === 0 ? 1 : 0.01
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

/** Formato de visualización según la unidad (enteros sin decimales; MTS/KG hasta 2). */
export function formatInventoryQuantity(
  value: string | number | null | undefined,
  unit: string
): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  const decimals = inventoryQuantityDecimals(unit)
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}
