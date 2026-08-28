import TasaCambioInvalidaException from '#exceptions/tasa_cambio_invalida_exception'
import CurrencyService from '#services/currency_service'

export type MonetaryEntryResolution = {
  currencyCode: string
  amountUsd: string
  entryRate: string | null
  amountNative: string
}

/**
 * Convierte un monto ingresado en moneda de documento a canónico (moneda base).
 * `entry_rate` = unidades de moneda de ingreso por 1 unidad de base (igual que currencies.rate_per_usd).
 * No modifica el catálogo de tasas.
 */
export async function resolveMonetaryEntryAmount(params: {
  amountNative: number
  currencyCode?: string | null
  entryRate?: number | null
  currencyService: CurrencyService
}): Promise<MonetaryEntryResolution> {
  const { currencyService } = params
  const baseCode = await currencyService.getBaseCurrencyCode()
  const currencyCode = (params.currencyCode ?? baseCode).toUpperCase()
  await currencyService.assertActiva(currencyCode)

  if (currencyCode === baseCode.toUpperCase()) {
    const amount = params.amountNative.toFixed(4)
    return {
      currencyCode,
      amountUsd: amount,
      entryRate: null,
      amountNative: amount,
    }
  }

  let rate =
    params.entryRate !== undefined && params.entryRate !== null ? Number(params.entryRate) : NaN
  if (!(rate > 0)) {
    const rates = await currencyService.getActiveRates()
    rate = rates[currencyCode] ?? NaN
  }

  if (!(rate > 0)) {
    throw new TasaCambioInvalidaException(`No hay tasa válida para ${currencyCode}`)
  }

  const amountUsd = (params.amountNative / rate).toFixed(4)
  const amountNative = params.amountNative.toFixed(4)

  return {
    currencyCode,
    amountUsd,
    entryRate: rate.toFixed(6),
    amountNative,
  }
}

export function nativeAmountFromBase(
  amountUsd: number,
  entryRate: string | null | undefined,
  currencyCode: string,
  baseCode: string
): string {
  if (!entryRate || currencyCode.toUpperCase() === baseCode.toUpperCase()) {
    return amountUsd.toFixed(4)
  }
  return (amountUsd * Number(entryRate)).toFixed(4)
}
