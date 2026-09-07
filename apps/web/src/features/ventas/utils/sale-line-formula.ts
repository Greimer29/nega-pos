import { calcProfitMarginPercent, calcSalePriceFromMargin } from '@/lib/profit-margin'
import type { CatalogProduct } from '@/features/ventas/types'

export type SaleLineFormulaMaterial = {
  material_id: number
  quantity_per_unit: number
}

export type SaleLineFormulaMaterialRef = SaleLineFormulaMaterial & {
  material?: {
    id: number
    code: string
    name: string
    unit?: string | null
    last_purchase_price_usd?: string | null
  }
}

export function getBaseFormulaMaterialIds(product: Pick<CatalogProduct, 'formula'>): Set<number> {
  return new Set((product.formula?.materials ?? []).map((item) => item.material_id))
}

export function hasAddedMaterialsBeyondBase(
  baseMaterialIds: Set<number>,
  customMaterials: SaleLineFormulaMaterial[]
): boolean {
  return customMaterials.some(
    (item) => item.quantity_per_unit > 0 && !baseMaterialIds.has(item.material_id)
  )
}

export function resolveCartLineUnitPriceUsd(
  product: CatalogProduct,
  customMaterials: SaleLineFormulaMaterial[] | null,
  materialRefs: SaleLineFormulaMaterialRef[]
): number {
  const catalogPrice = Number(product.sale_price_usd)

  if (!customMaterials || customMaterials.length === 0) {
    return catalogPrice
  }

  const baseIds = getBaseFormulaMaterialIds(product)
  if (!hasAddedMaterialsBeyondBase(baseIds, customMaterials)) {
    return catalogPrice
  }

  const effectiveCost = materialRefs.reduce((sum, item) => {
    const unitCost = Number(item.material?.last_purchase_price_usd ?? 0)
    return sum + item.quantity_per_unit * unitCost
  }, 0)

  const margin = calcProfitMarginPercent(product.sale_price_usd, product.cost_usd)
  if (margin === null) {
    return catalogPrice
  }

  const recalculated = calcSalePriceFromMargin(effectiveCost, margin)
  return recalculated ?? catalogPrice
}

export function createCartLineId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function formulaMaterialsSignature(
  materials: SaleLineFormulaMaterial[] | null | undefined
): string {
  if (!materials || materials.length === 0) {
    return ''
  }

  return JSON.stringify(
    [...materials]
      .filter((item) => item.quantity_per_unit > 0)
      .sort((a, b) => a.material_id - b.material_id)
      .map((item) => ({
        material_id: item.material_id,
        quantity_per_unit: Number(item.quantity_per_unit.toFixed(2)),
      }))
  )
}

export function mapCatalogFormulaToLineMaterials(
  materials: Array<{ material_id: number; quantity: string }>
): SaleLineFormulaMaterial[] {
  return materials.map((item) => ({
    material_id: item.material_id,
    quantity_per_unit: Number(item.quantity),
  }))
}

export function mapApiFormulaMaterialsToLine(
  materials: Array<{
    material_id: number
    quantity_per_unit: string | number
    material?: SaleLineFormulaMaterialRef['material']
  }>
): SaleLineFormulaMaterialRef[] {
  return materials.map((item) => ({
    material_id: item.material_id,
    quantity_per_unit: Number(item.quantity_per_unit),
    material: item.material,
  }))
}
