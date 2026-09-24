export const MIN_WHOLESALE_UNITS_PER_PACK = 2

export type WholesaleFields = {
  wholesale_enabled?: boolean | null
  wholesaleEnabled?: boolean | null
  wholesale_units_per_pack?: string | number | null
  wholesaleUnitsPerPack?: string | number | null
  wholesale_cost_usd?: string | number | null
  wholesaleCostUsd?: string | number | null
  wholesale_sale_price_usd?: string | number | null
  wholesaleSalePriceUsd?: string | number | null
}

export function hasWholesaleConfig(source: WholesaleFields | null | undefined): boolean {
  if (!source) return false
  return Boolean(source.wholesale_enabled ?? source.wholesaleEnabled)
}

export function wholesaleUnitsPerPack(source: WholesaleFields | null | undefined): number | null {
  if (!source) return null
  const raw = source.wholesale_units_per_pack ?? source.wholesaleUnitsPerPack
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < MIN_WHOLESALE_UNITS_PER_PACK) {
    return null
  }
  return parsed
}

export function wholesalePackCostUsd(source: WholesaleFields | null | undefined): number | null {
  if (!source) return null
  const raw = source.wholesale_cost_usd ?? source.wholesaleCostUsd
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function wholesalePackSaleUsd(source: WholesaleFields | null | undefined): number | null {
  if (!source) return null
  const raw = source.wholesale_sale_price_usd ?? source.wholesaleSalePriceUsd
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function deriveUnitCostFromPack(packCost: number, unitsPerPack: number): number {
  if (!Number.isFinite(packCost) || !Number.isFinite(unitsPerPack) || unitsPerPack <= 0) {
    return 0
  }
  return packCost / unitsPerPack
}

export function lineInventoryQuantity(
  lineQuantity: number,
  isWholesale: boolean,
  unitsPerPack: number | string | null | undefined
): number {
  if (!isWholesale) return lineQuantity
  const pack = Number(unitsPerPack)
  if (!Number.isFinite(pack) || pack < MIN_WHOLESALE_UNITS_PER_PACK) {
    return lineQuantity
  }
  return lineQuantity * pack
}
