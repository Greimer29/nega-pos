import vine from '@vinejs/vine'

export const listSalesShiftsValidator = vine.create({
  page: vine.number().min(1).optional(),
  per_page: vine.number().min(1).max(100).optional(),
  status: vine.enum(['OPEN', 'CLOSED'] as const).optional(),
})

export const openSalesShiftValidator = vine.create({
  notes: vine.string().trim().maxLength(2000).optional(),
})
