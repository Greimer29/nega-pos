import type Income from '#models/income'
import { serializeAccountResumen } from '#transformers/account_transformer'
import CurrencyService from '#services/currency_service'
import { nativeAmountFromBase } from '#utils/monetary_entry'

const currencyService = new CurrencyService()

export async function serializeIncome(income: Income) {
  const baseCode = await currencyService.getBaseCurrencyCode()
  const currencyCode = income.currencyCode ?? baseCode
  const amountUsd = Number(income.amountUsd ?? 0).toFixed(4)
  const amount = nativeAmountFromBase(
    Number(amountUsd),
    income.entryRate,
    currencyCode,
    baseCode
  )

  return {
    id: Number(income.id),
    date: income.date.toISODate(),
    description: income.description,
    amount,
    currencyCode,
    entryRate: income.entryRate,
    amountUsd,
    accountId: income.accountId ? Number(income.accountId) : null,
    createdAt: income.createdAt,
    updatedAt: income.updatedAt,
    ...(income.account ? { account: serializeAccountResumen(income.account) } : {}),
  }
}
