import vine from '@vinejs/vine'

const isoDate = vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const createSupplierInvoiceValidator = vine.create({
  date: isoDate,
  amount: vine.number().positive(),
  currency_code: vine.string().trim().toUpperCase().fixedLength(3).optional(),
  entry_rate: vine.number().positive().optional(),
  invoice_number: vine.string().trim().maxLength(50).optional(),
  note: vine.string().trim().maxLength(255).optional(),
  is_credit: vine.boolean(),
  account_id: vine.number().min(1).nullable().optional(),
  credit_due_date: isoDate.nullable().optional(),
})

export type SupplierInvoiceValidatorPayload = {
  date: string
  amount: number
  currency_code?: string
  entry_rate?: number
  invoice_number?: string
  note?: string
  is_credit: boolean
  account_id?: number | null
  credit_due_date?: string | null
}
