import MonedaRegistroUsdRequeridaException from '#exceptions/moneda_registro_usd_requerida_exception'

export function assertRegistroMonedaUsd(currencyCode?: string | null) {
  const code = (currencyCode ?? 'USD').toUpperCase()

  if (code !== 'USD') {
    throw new MonedaRegistroUsdRequeridaException()
  }
}
