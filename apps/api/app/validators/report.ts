import vine from '@vinejs/vine'

const isoDate = vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const month = vine.string().regex(/^\d{4}-\d{2}$/)
const movementTypes = ['purchases', 'expenses', 'machine_expenses', 'sales'] as const

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
