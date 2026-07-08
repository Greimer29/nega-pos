import vine from '@vinejs/vine'

const isoDate = vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const expenseFields = {
  date: isoDate,

  description: vine.string().trim().maxLength(255),

  amount: vine.number().min(0).optional(),

  amount_usd: vine.number().min(0).optional(),

  currency_code: vine.string().trim().toUpperCase().fixedLength(3).optional(),

  account_id: vine.number().min(1).nullable().optional(),
}

export const createExpenseValidator = vine.create({
  ...expenseFields,
})

export const updateExpenseValidator = vine.create({
  ...expenseFields,
})

export const listExpensesValidator = vine.create({
  page: vine.number().min(1).optional(),

  per_page: vine.number().min(1).max(100).optional(),

  account_id: vine.number().min(1).optional(),

  unassigned: vine.boolean().optional(),
})

export type ExpenseValidatorPayload = {
  date: string

  description: string

  amount?: number

  amount_usd?: number

  currency_code?: string

  account_id?: number | null
}

export function resolveExpenseAmount(payload: ExpenseValidatorPayload): number {
  const amount = payload.amount ?? payload.amount_usd

  if (amount === undefined) {
    throw new Error('amount is required')
  }

  return amount
}
