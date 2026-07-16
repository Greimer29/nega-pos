/** Códigos que permiten hasta 4 decimales al *ingresar* precios (compras). */
const HIGH_PRECISION_ENTRY_CODES = new Set(['XAU', 'XAG', 'BTC', 'ETH'])

/**
 * Precisión para visualización (dashboard, reportes, ventas, display currency).
 * Siempre 2 decimales para montos mostrados.
 */
export function nativeCurrencyDecimals(_currencyCode?: string): number {
  return 2
}

/** Precisión al ingresar precios unitarios en compras / montos canónicos de alta resolución. */
export function currencyEntryDecimals(currencyCode: string): number {
  const code = currencyCode.toUpperCase()
  if (HIGH_PRECISION_ENTRY_CODES.has(code)) return 4
  if (code === 'USD' || code === 'VES') return 2
  return 2
}

export function formatNativeAmountNumber(value: number, currencyCode: string): string {
  const decimals = nativeCurrencyDecimals(currencyCode)
  if (!Number.isFinite(value)) {
    return (0).toLocaleString('es-VE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  return value.toLocaleString('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}
