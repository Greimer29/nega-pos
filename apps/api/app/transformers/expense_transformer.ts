import type Expense from '#models/expense'

import { serializeAccountResumen } from '#transformers/account_transformer'

import CurrencyService from '#services/currency_service'

const currencyService = new CurrencyService()

export async function serializeExpense(expense: Expense) {
  const rates = await currencyService.getActiveRates()

  const currencyCode = expense.currencyCode ?? 'USD'

  const amount = expense.amountUsd

  const amountUsd = currencyService.toUsd(Number(amount ?? 0), currencyCode, rates).toFixed(4)

  return {
    id: Number(expense.id),

    date: expense.date.toISODate(),

    description: expense.description,

    amount,

    currencyCode,

    amountUsd,

    accountId: expense.accountId ? Number(expense.accountId) : null,

    createdAt: expense.createdAt,

    updatedAt: expense.updatedAt,

    ...(expense.account ? { account: serializeAccountResumen(expense.account) } : {}),
  }
}
