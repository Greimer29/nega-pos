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
