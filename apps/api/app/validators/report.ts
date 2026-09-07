import vine from '@vinejs/vine'

const isoDate = vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const month = vine.string().regex(/^\d{4}-\d{2}$/)
const movementTypes = ['purchases', 'expenses', 'machine_expenses', 'sales', 'incomes'] as const

function normalizeMovementTypes(value: string | string[] | undefined) {
  if (!value) return undefined

  const parts = (Array.isArray(value) ? value : value.split(',')).map((part) => part.trim())

  return parts.filter((part): part is (typeof movementTypes)[number] =>
    (movementTypes as readonly string[]).includes(part)
  )
}

export const accountStatementValidator = vine.create({
  from: isoDate.optional(),
  to: isoDate.optional(),
  month: month.optional(),
  account_id: vine.number().min(1).optional(),
  unassigned: vine.boolean().optional(),
  display_currency: vine.string().trim().toUpperCase().fixedLength(3).optional(),
  types: vine
    .any()
    .optional()
    .transform((value: unknown) => {
      if (value === undefined || value === null || value === '') {
        return undefined
      }

      return normalizeMovementTypes(value as string | string[])
    }),
})

const inventorySortBy = ['id', 'name', 'sale_price', 'quantity'] as const
const inventorySortDir = ['asc', 'desc'] as const

const inventoryMovementTypeValues = [
  'PURCHASE_IN',
  'SALE_OUT',
  'MANUAL_ADJUSTMENT',
  'MANUAL_CARGO',
  'MANUAL_DESCARGO',
  'REVERSAL_ADJUSTMENT',
  'PRICE_CHANGE',
] as const

function normalizeInventoryMovementTypes(value: string | string[] | undefined) {
  if (!value) return undefined

  const parts = (Array.isArray(value) ? value : value.split(',')).map((part) => part.trim())

  return parts.filter((part): part is (typeof inventoryMovementTypeValues)[number] =>
    (inventoryMovementTypeValues as readonly string[]).includes(part)
  )
}

export const inventoryReportValidator = vine.create({
  search: vine.string().trim().maxLength(100).optional(),
  category: vine.string().trim().maxLength(100).optional(),
  sort_by: vine.enum(inventorySortBy).optional(),
  sort_dir: vine.enum(inventorySortDir).optional(),
  active: vine.boolean().optional(),
  low_stock: vine.boolean().optional(),
  hide_zero: vine.boolean().optional(),
  page: vine.number().min(1).optional(),
  per_page: vine.number().min(1).max(200).optional(),
  export: vine.boolean().optional(),
})

export const inventoryMovementsValidator = vine.create({
  from: isoDate.optional(),
  to: isoDate.optional(),
  month: month.optional(),
  page: vine.number().min(1).optional(),
  per_page: vine.number().min(1).max(200).optional(),
  export: vine.boolean().optional(),
  types: vine
    .any()
    .optional()
    .transform((value: unknown) => {
      if (value === undefined || value === null || value === '') {
        return undefined
      }

      return normalizeInventoryMovementTypes(value as string | string[])
    }),
})
