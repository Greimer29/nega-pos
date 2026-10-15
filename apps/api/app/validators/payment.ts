import vine from '@vinejs/vine'

const isoDate = vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const paymentAmountFields = {
  /** Monto en moneda de ingreso. Preferido; si falta se usa amount_usd (base). */
  amount: vine.number().positive().optional(),
  amount_usd: vine.number().positive().optional(),
  currency_code: vine.string().trim().toUpperCase().fixedLength(3).optional(),
  entry_rate: vine.number().positive().optional(),
}

export const createCustomerPaymentValidator = vine.create({
  sale_id: vine.number().min(1).nullable().optional(),
  order_id: vine.number().min(1).nullable().optional(),
  account_id: vine.number().min(1).nullable().optional(),
  ...paymentAmountFields,
  date: isoDate,
  note: vine.string().trim().maxLength(255).optional(),
})

export const createSupplierPaymentValidator = vine.create({
  purchase_id: vine.number().min(1).nullable().optional(),
  account_id: vine.number().min(1).nullable().optional(),
  ...paymentAmountFields,
  date: isoDate,
  note: vine.string().trim().maxLength(255).optional(),
})
