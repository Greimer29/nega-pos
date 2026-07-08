import vine from '@vinejs/vine'

const isoDate = vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const createCustomerPaymentValidator = vine.create({
  sale_id: vine.number().min(1).nullable().optional(),
  order_id: vine.number().min(1).nullable().optional(),
  account_id: vine.number().min(1).nullable().optional(),
  amount_usd: vine.number().positive(),
  date: isoDate,
  note: vine.string().trim().maxLength(255).optional(),
})

export const createSupplierPaymentValidator = vine.create({
  purchase_id: vine.number().min(1).nullable().optional(),
  account_id: vine.number().min(1).nullable().optional(),
  amount_usd: vine.number().positive(),
  date: isoDate,
  note: vine.string().trim().maxLength(255).optional(),
})
