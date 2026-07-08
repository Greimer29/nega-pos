export const MACHINE_TYPES = [
  'STRAIGHT_STITCH',
  'OVERLOCK',
  'COVERSTITCH',
  'CUTTER',
  'EMBROIDERY',
  'OTHER',
] as const

export const MACHINE_STATUSES = ['OPERATIONAL', 'UNDER_REPAIR', 'OUT_OF_SERVICE'] as const

export const MACHINE_EXPENSE_CATEGORIES = ['REPAIR', 'SUPPLY', 'MAINTENANCE', 'OTHER'] as const

export type MachineType = (typeof MACHINE_TYPES)[number]
export type MachineStatus = (typeof MACHINE_STATUSES)[number]
export type MachineExpenseCategory = (typeof MACHINE_EXPENSE_CATEGORIES)[number]

export const MACHINE_TYPE_LABELS: Record<MachineType, string> = {
  STRAIGHT_STITCH: 'Recta',
  OVERLOCK: 'Overlock',
  COVERSTITCH: 'Collaretera',
  CUTTER: 'Cortadora',
  EMBROIDERY: 'Bordadora',
  OTHER: 'Otro',
}

export const MACHINE_STATUS_LABELS: Record<MachineStatus, string> = {
  OPERATIONAL: 'Operativa',
  UNDER_REPAIR: 'En reparación',
  OUT_OF_SERVICE: 'Fuera de servicio',
}

export const MACHINE_EXPENSE_CATEGORY_LABELS: Record<MachineExpenseCategory, string> = {
  REPAIR: 'Reparación',
  SUPPLY: 'Insumo',
  MAINTENANCE: 'Mantenimiento',
  OTHER: 'Otro',
}

export function formatMachineTypeLabel(type: string) {
  return MACHINE_TYPE_LABELS[type as MachineType] ?? type
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
