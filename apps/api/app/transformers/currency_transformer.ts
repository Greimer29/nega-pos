import type Currency from '#models/currency'

export function serializeCurrency(currency: Currency) {
  return {
    code: currency.code,
    name: currency.name,
    ratePerUsd: currency.ratePerUsd,
    isActive: Boolean(currency.isActive),
    createdAt: currency.createdAt,
    updatedAt: currency.updatedAt,
  }
}
