const HIGH_PRECISION_CODES = new Set(['XAU', 'XAG', 'BTC', 'ETH'])

export function nativeCurrencyDecimals(currencyCode: string): number {
  const code = currencyCode.toUpperCase()
  if (code === 'USD') return 2
  if (code === 'VES') return 2
  if (HIGH_PRECISION_CODES.has(code)) return 4
  return 4
}

/** Convierte monto en moneda base → monto nativo de la operación. */
export function convertBaseToNativeAmount(
  totalBase: number,
  currencyCode: string,
  ratePerBase: number,
  baseCurrencyCode = 'XAU'
): number {
  if (currencyCode.toUpperCase() === baseCurrencyCode.toUpperCase()) {
    return totalBase
  }

  return totalBase * ratePerBase
}

/** @deprecated Usar convertBaseToNativeAmount */
export function convertUsdToNativeAmount(
  totalUsd: number,
  currencyCode: string,
  ratePerUsd: number
): number {
  return convertBaseToNativeAmount(totalUsd, currencyCode, ratePerUsd, 'USD')
}

export function formatNativeAmount(amount: number, currencyCode: string): string {
  const decimals = nativeCurrencyDecimals(currencyCode)
  if (!Number.isFinite(amount)) {
    return (0).toFixed(decimals)
  }

  return amount.toFixed(decimals)
}

export function formatSaleNativeTotal(
  totalBase: number,
  currencyCode: string,
  ratePerBase: number,
  baseCurrencyCode = 'XAU'
): string | null {
  if (!Number.isFinite(ratePerBase) || ratePerBase <= 0) {
    return null
  }

  const amount = convertBaseToNativeAmount(totalBase, currencyCode, ratePerBase, baseCurrencyCode)
  return formatNativeAmount(amount, currencyCode)
}
