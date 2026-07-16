import { formatNativeAmountNumber } from '@/features/currencies/utils/currency-decimals'

export function buildRatesMap(
  currencies: Array<{ code: string; ratePerUsd: string }>,
  baseCurrencyCode = 'XAU'
) {
  const base = baseCurrencyCode.toUpperCase()
  const rates: Record<string, number> = { [base]: 1 }

  for (const currency of currencies) {
    if (currency.code.toUpperCase() === base) {
      rates[base] = 1
      continue
    }
    const rate = Number(currency.ratePerUsd)
    if (Number.isFinite(rate) && rate > 0) {
      rates[currency.code] = rate
    }
  }

  return rates
}

/** Monto en currencyCode → moneda base. */
export function toBase(
  amount: number,
  currencyCode: string,
  rates: Record<string, number>,
  baseCurrencyCode = 'XAU'
): number {
  const code = currencyCode.toUpperCase()
  const base = baseCurrencyCode.toUpperCase()
  if (code === base) return amount
  const rate = rates[code] ?? 1
  return rate > 0 ? amount / rate : amount
}

/** Monto en moneda base → currencyCode. */
export function fromBase(
  amountBase: number,
  currencyCode: string,
  rates: Record<string, number>,
  baseCurrencyCode = 'XAU'
): number {
  const code = currencyCode.toUpperCase()
  const base = baseCurrencyCode.toUpperCase()
  if (code === base) return amountBase
  const rate = rates[code] ?? 1
  return amountBase * rate
}

/** @deprecated Usar toBase */
export function toUsd(
  amount: number,
  currencyCode: string,
  rates: Record<string, number>
): number {
  const base =
    Object.entries(rates).find(([, rate]) => rate === 1)?.[0] ??
    (rates.USD === 1 ? 'USD' : 'XAU')
  return toBase(amount, currencyCode, rates, base)
}

/** @deprecated Usar fromBase */
export function fromUsd(
  amountUsd: number,
  currencyCode: string,
  rates: Record<string, number>
): number {
  const base =
    Object.entries(rates).find(([, rate]) => rate === 1)?.[0] ??
    (rates.USD === 1 ? 'USD' : 'XAU')
  return fromBase(amountUsd, currencyCode, rates, base)
}

export function currencySymbol(code: string) {
  if (code === 'USD') return '$'
  if (code === 'VES') return 'Bs'
  if (code === 'XAU') return 'Au'
  return code
}

export function formatAmountNumber(value: number, currencyCode: string) {
  return formatNativeAmountNumber(value, currencyCode)
}

export function formatMoneyLabel(
  value: string | number | null | undefined,
  currencyCode: string
) {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return `${currencySymbol(currencyCode)} ${formatAmountNumber(num, currencyCode)}`
}
