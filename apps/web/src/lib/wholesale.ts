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

function formatQtyNumber(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return value.toLocaleString('es-VE', {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
  })
}

/**
 * Ej.: "10 paq. × 20 und = 200 und"
 * Deja explícito que la cantidad de línea son paquetes y el stock sale en unidades.
 */
export function formatWholesalePackSummary(
  packs: number,
  unitsPerPack: number,
  unitAbrev = 'und'
): string {
  const safePacks = Number.isFinite(packs) ? packs : 0
  const safeUnits =
    Number.isFinite(unitsPerPack) && unitsPerPack >= MIN_WHOLESALE_UNITS_PER_PACK
      ? unitsPerPack
      : 0
  const total = safePacks * safeUnits
  return `${formatQtyNumber(safePacks)} paq. × ${formatQtyNumber(safeUnits)} ${unitAbrev} = ${formatQtyNumber(total)} ${unitAbrev}`
}

/** Etiqueta corta para columnas: "10 paq · 200 und". */
export function formatWholesaleQuantityShort(
  packs: number,
  unitsPerPack: number | string | null | undefined,
  unitAbrev = 'und'
): string {
  const packSize = Number(unitsPerPack)
  const safePacks = Number.isFinite(packs) ? packs : 0
  if (!Number.isFinite(packSize) || packSize < MIN_WHOLESALE_UNITS_PER_PACK) {
    return `${formatQtyNumber(safePacks)} paq`
  }
  const total = safePacks * packSize
  return `${formatQtyNumber(safePacks)} paq · ${formatQtyNumber(total)} ${unitAbrev}`
}

/** Precio de línea: mayorista = c/paq, detalle = c/u. */
export function saleLinePriceUnitLabel(isWholesale: boolean): 'c/paq' | 'c/u' {
  return isWholesale ? 'c/paq' : 'c/u'
}
