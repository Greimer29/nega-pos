import MonedaRegistroUsdRequeridaException from '#exceptions/moneda_registro_usd_requerida_exception'

export const MONETARY_REGISTRATION_BASE_MESSAGE =
  'El monto debe registrarse en la moneda base del sistema'

/**
 * Los gastos y cargos similares se registran directamente en la moneda base
 * (columnas amount_usd = monto canónico en base).
 */
export function assertRegistroMonedaBase(
  currencyCode: string | null | undefined,
  baseCurrencyCode: string
) {
  const code = (currencyCode ?? baseCurrencyCode).toUpperCase()
  const base = baseCurrencyCode.toUpperCase()

  if (code !== base) {
    throw new MonedaRegistroUsdRequeridaException(
      `${MONETARY_REGISTRATION_BASE_MESSAGE} (${base}).`
    )
  }
}

/** @deprecated Usar assertRegistroMonedaBase */
export function assertRegistroMonedaUsd(currencyCode?: string | null) {
  assertRegistroMonedaBase(currencyCode, 'USD')
}
