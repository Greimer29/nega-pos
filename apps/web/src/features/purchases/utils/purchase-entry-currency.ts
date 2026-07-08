export type PurchaseEntryCurrency = 'USD' | 'VES'

const USD_DECIMALS = 4
const BS_DECIMALS = 2

export function isValidPurchaseRate(rate: number | null | undefined): rate is number {
  return rate != null && Number.isFinite(rate) && rate > 0
}

export function roundUsd(amount: number): number {
  const factor = 10 ** USD_DECIMALS
  return Math.round(amount * factor) / factor
}

export function roundBs(amount: number): number {
  const factor = 10 ** BS_DECIMALS
  return Math.round(amount * factor) / factor
}

export function bsToUsd(bs: number, rate: number): number {
  if (!isValidPurchaseRate(rate)) return 0
  return roundUsd(bs / rate)
}

export function usdToBs(usd: number, rate: number): number {
  if (!isValidPurchaseRate(rate)) return 0
  return roundBs(usd * rate)
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
  unitPriceBsEntered?: number
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

  if (entryCurrency === 'VES' && isValidPurchaseRate(rate)) {
    const unitPriceBs =
      unitPriceBsEntered ?? usdToBs(item.unitPriceUsd, rate)
    return { ...base, unit_price_bs: unitPriceBs }
  }

  return base
}
