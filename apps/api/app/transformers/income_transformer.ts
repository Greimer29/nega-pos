import type Income from '#models/income'
import { serializeAccountResumen } from '#transformers/account_transformer'
import CurrencyService from '#services/currency_service'

const currencyService = new CurrencyService()

export async function serializeIncome(income: Income) {
  const rates = await currencyService.getActiveRates()
  const currencyCode = income.currencyCode ?? 'USD'
  const amount = income.amountUsd
  const amountUsd = currencyService.toUsd(Number(amount ?? 0), currencyCode, rates).toFixed(4)

  return {
    id: Number(income.id),
    date: income.date.toISODate(),
    description: income.description,
    amount,
    currencyCode,
    amountUsd,
    accountId: income.accountId ? Number(income.accountId) : null,
    createdAt: income.createdAt,
    updatedAt: income.updatedAt,
    ...(income.account ? { account: serializeAccountResumen(income.account) } : {}),
  }
}
