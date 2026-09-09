import type Expense from '#models/expense'
import { serializeAccountResumen } from '#transformers/account_transformer'
import CurrencyService from '#services/currency_service'
import { nativeAmountFromBase } from '#utils/monetary_entry'

const currencyService = new CurrencyService()

export async function serializeExpense(expense: Expense) {
  const baseCode = await currencyService.getBaseCurrencyCode()
  const currencyCode = expense.currencyCode ?? baseCode
  const amountUsd = Number(expense.amountUsd ?? 0).toFixed(4)
  const amount = nativeAmountFromBase(
    Number(amountUsd),
    expense.entryRate,
    currencyCode,
    baseCode
  )

  return {
    id: Number(expense.id),
    date: expense.date.toISODate(),
    description: expense.description,
    amount,
    currencyCode,
    entryRate: expense.entryRate,
    amountUsd,
    accountId: expense.accountId ? Number(expense.accountId) : null,
    supplierId: expense.supplierId ? Number(expense.supplierId) : null,
    invoiceNumber: expense.invoiceNumber,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
    ...(expense.account ? { account: serializeAccountResumen(expense.account) } : {}),
  }
}
