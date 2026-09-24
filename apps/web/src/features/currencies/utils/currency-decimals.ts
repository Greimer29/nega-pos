export const MONEY_DISPLAY_MIN_DECIMALS = 2
export const MONEY_DISPLAY_MAX_DECIMALS = 4
export const MONEY_ENTRY_DECIMALS = 4

/**
 * Precisión máxima para visualización. El formateo usa 2–4 decimales
 * para no ocultar costos como 0.0202.
 */
export function nativeCurrencyDecimals(_currencyCode?: string): number {
  return MONEY_DISPLAY_MAX_DECIMALS
}

/** Precisión al ingresar precios unitarios (costo/venta/compras). */
export function currencyEntryDecimals(_currencyCode?: string): number {
  return MONEY_ENTRY_DECIMALS
}

export function formatNativeAmountNumber(value: number, _currencyCode?: string): string {
  if (!Number.isFinite(value)) {
    return (0).toLocaleString('es-VE', {
      minimumFractionDigits: MONEY_DISPLAY_MIN_DECIMALS,
      maximumFractionDigits: MONEY_DISPLAY_MAX_DECIMALS,
    })
  }

  return value.toLocaleString('es-VE', {
    minimumFractionDigits: MONEY_DISPLAY_MIN_DECIMALS,
    maximumFractionDigits: MONEY_DISPLAY_MAX_DECIMALS,
  })
}
