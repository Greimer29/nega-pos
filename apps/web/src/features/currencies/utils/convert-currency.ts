export function buildRatesMap(currencies: Array<{ code: string; ratePerUsd: string }>) {
  const rates: Record<string, number> = { USD: 1 }

  for (const currency of currencies) {
    const rate = Number(currency.ratePerUsd)
    if (Number.isFinite(rate) && rate > 0) {
      rates[currency.code] = rate
    }
  }

  return rates
}

export function toUsd(
  amount: number,
  currencyCode: string,
  rates: Record<string, number>
): number {
  const code = currencyCode.toUpperCase()
  if (code === 'USD') return amount
  const rate = rates[code] ?? 1
  return rate > 0 ? amount / rate : amount
}

export function fromUsd(
  amountUsd: number,
  currencyCode: string,
  rates: Record<string, number>
): number {
  const code = currencyCode.toUpperCase()
  if (code === 'USD') return amountUsd
  const rate = rates[code] ?? 1
  return amountUsd * rate
}

export function currencySymbol(code: string) {
  if (code === 'USD') return '$'
  if (code === 'VES') return 'Bs'
  return code
}

export function formatAmountNumber(value: number, currencyCode: string) {
  return value.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: currencyCode === 'USD' ? 4 : 2,
  })
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
