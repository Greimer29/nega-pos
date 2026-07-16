import { currencyEntryDecimals } from '@/features/currencies/utils/currency-decimals'

export type PurchaseEntryCurrency = string

const BASE_DECIMALS = 4

export function isValidPurchaseRate(rate: number | null | undefined): rate is number {
  return rate != null && Number.isFinite(rate) && rate > 0
}

/** true cuando el ingreso no es en la moneda base (canónica). */
export function isPurchaseEntryInNative(
  entryCurrency: string,
  baseCurrencyCode = 'XAU'
): boolean {
  return entryCurrency.toUpperCase() !== baseCurrencyCode.toUpperCase()
}

/** Decimales al cargar precios unitarios en compras (XAU → 4). */
export function purchaseEntryDecimals(currencyCode: string): number {
  return currencyEntryDecimals(currencyCode)
}

export function roundBase(amount: number): number {
  const factor = 10 ** BASE_DECIMALS
  return Math.round(amount * factor) / factor
}

/** @deprecated Usar roundBase */
export function roundUsd(amount: number): number {
  return roundBase(amount)
}

export function roundNative(amount: number, currencyCode = 'VES'): number {
  const decimals = purchaseEntryDecimals(currencyCode)
  const factor = 10 ** decimals
  return Math.round(amount * factor) / factor
}

/** Monto en moneda de ingreso → moneda base (÷ tasa vs base). */
export function nativeToBase(native: number, rate: number): number {
  if (!isValidPurchaseRate(rate)) return 0
  return roundBase(native / rate)
}

/** @deprecated Usar nativeToBase */
export function nativeToUsd(native: number, rate: number): number {
  return nativeToBase(native, rate)
}

/** Monto en moneda base → moneda de ingreso (× tasa vs base). */
export function baseToNative(base: number, rate: number, currencyCode = 'VES'): number {
  if (!isValidPurchaseRate(rate)) return 0
  return roundNative(base * rate, currencyCode)
}

/** @deprecated Usar baseToNative */
export function usdToNative(usd: number, rate: number, currencyCode = 'VES'): number {
  return baseToNative(usd, rate, currencyCode)
}

/** @deprecated Use nativeToBase */
export function bsToUsd(bs: number, rate: number): number {
  return nativeToBase(bs, rate)
}

/** @deprecated Use baseToNative */
export function usdToBs(usd: number, rate: number): number {
  return baseToNative(usd, rate, 'VES')
}

export function inferPurchaseEntryCurrency(
  purchase: {
    entryCurrencyCode?: string | null
    usdRate?: string | null
  },
  baseCurrencyCode = 'XAU'
): string {
  if (purchase.entryCurrencyCode?.trim()) {
    return purchase.entryCurrencyCode.trim().toUpperCase()
  }
  if (purchase.usdRate) {
    return 'VES'
  }
  return baseCurrencyCode.toUpperCase()
}

export function formatItemNativeDisplay(
  unitPriceBase: number,
  rate: number | null,
  currencyCode: string,
  baseCurrencyCode = 'XAU'
): number {
  if (!isValidPurchaseRate(rate) || !isPurchaseEntryInNative(currencyCode, baseCurrencyCode)) {
    return 0
  }
  const native = baseToNative(unitPriceBase, rate, currencyCode)
  return Number.isFinite(native) ? native : 0
}

type PurchaseItemPersistFields = {
  itemType: 'material' | 'product'
  materialId?: number
  catalogProductId?: number
  quantity: number
  unitPriceUsd: number
}

export function buildPurchaseItemPayload(
  item: PurchaseItemPersistFields,
  entryCurrency: PurchaseEntryCurrency,
  rate: number,
  unitPriceNativeEntered?: number,
  baseCurrencyCode = 'XAU'
) {
  const base =
    item.itemType === 'product'
      ? {
          catalog_product_id: item.catalogProductId,
          quantity: item.quantity,
          unit_price_usd: item.unitPriceUsd,
        }
      : {
          material_id: item.materialId,
          quantity: item.quantity,
          unit_price_usd: item.unitPriceUsd,
        }

  if (
    isPurchaseEntryInNative(entryCurrency, baseCurrencyCode) &&
    isValidPurchaseRate(rate)
  ) {
    const unitPriceNative =
      unitPriceNativeEntered ?? baseToNative(item.unitPriceUsd, rate, entryCurrency)
    return { ...base, unit_price_bs: unitPriceNative }
  }

  return base
}

export function entryRateLabel(
  currencyCode: string,
  symbol: string,
  baseCurrencyCode = 'XAU'
): string {
  if (currencyCode.toUpperCase() === baseCurrencyCode.toUpperCase()) {
    return 'Moneda de ingreso'
  }
  return `Tasa ${symbol}/${baseCurrencyCode}`
}

export function unitPriceColumnLabel(currencyCode: string, symbol: string): string {
  return `Precio unit. (${symbol})`
}

export function subtotalColumnLabel(currencyCode: string, symbol: string): string {
  return `Subtotal (${symbol})`
}
