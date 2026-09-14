import vine from '@vinejs/vine'

const isoDate = vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const createCustomerInvoiceValidator = vine.create({
  date: isoDate,
  amount: vine.number().positive(),
  currency_code: vine.string().trim().toUpperCase().fixedLength(3).optional(),
  entry_rate: vine.number().positive().optional(),
  note: vine.string().trim().maxLength(255).optional(),
  is_credit: vine.boolean(),
  payment_method_code: vine.string().trim().maxLength(50).nullable().optional(),
  credit_due_date: isoDate.nullable().optional(),
  usd_rate: vine.number().positive().optional(),
})

export type CustomerInvoiceValidatorPayload = {
  date: string
  amount: number
  currency_code?: string
  entry_rate?: number
  note?: string
  is_credit: boolean
  payment_method_code?: string | null
  credit_due_date?: string | null
  usd_rate?: number
}
