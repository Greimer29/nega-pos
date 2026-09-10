import LineaVentaInvalidaException from '#exceptions/linea_venta_invalida_exception'
import MaterialNoEncontradoException from '#exceptions/material_no_encontrado_exception'
import type CatalogProduct from '#models/catalog_product'
import Material from '#models/material'
import type SaleLine from '#models/sale_line'
import type SaleLineMaterial from '#models/sale_line_material'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export type SaleLineFormulaMaterialInput = {
  material_id: number
  quantity_per_unit: number
}

export type ResolvedSaleLineFormulaMaterial = {
  materialId: number
  quantityPerUnit: string
}

export type EffectiveFormulaMaterial = {
  materialId: number
  quantityPerUnit: number
  material?: Material
}

export function normalizeFormulaMaterialsInput(
  items: SaleLineFormulaMaterialInput[] | undefined
): ResolvedSaleLineFormulaMaterial[] | null {
  if (items === undefined) {
    return null
  }

  const normalized = items
    .filter((item) => item.quantity_per_unit > 0)
    .map((item) => ({
      materialId: item.material_id,
      quantityPerUnit: item.quantity_per_unit.toFixed(3),
    }))

  if (normalized.length === 0) {
    throw new LineaVentaInvalidaException(
      'La receta personalizada debe incluir al menos un material con cantidad mayor a cero'
    )
  }

  return normalized
}

export async function assertFormulaMaterialsAllowed(
  product: CatalogProduct,
  formulaMaterials: SaleLineFormulaMaterialInput[] | undefined
) {
  if (formulaMaterials === undefined) {
    return
  }

  if (!product.formulaId) {
    throw new LineaVentaInvalidaException(
      'Solo los productos con fórmula pueden tener materiales personalizados en la venta'
    )
  }

  normalizeFormulaMaterialsInput(formulaMaterials)

  const materialIds = [...new Set(formulaMaterials.map((item) => item.material_id))]
  const materials = await Material.query().whereIn('id', materialIds)
  if (materials.length !== materialIds.length) {
    throw new MaterialNoEncontradoException()
  }
}

export function resolveEffectiveFormulaMaterials(
  line: SaleLine,
  product: CatalogProduct | null | undefined
): EffectiveFormulaMaterial[] {
  const customMaterials = line.saleLineMaterials ?? []

  if (customMaterials.length > 0) {
    return customMaterials.map((item: SaleLineMaterial) => ({
      materialId: Number(item.materialId),
      quantityPerUnit: Number(item.quantityPerUnit),
      material: item.material ?? undefined,
    }))
  }

  return (product?.formula?.materials ?? []).map((item) => ({
    materialId: Number(item.materialId),
    quantityPerUnit: Number(item.quantity),
    material: item.material ?? undefined,
  }))
}

export function sumEffectiveMaterialCostUsd(materials: EffectiveFormulaMaterial[]): string {
  const total = materials.reduce((sum, item) => {
    const unitCost = Number(item.material?.lastPurchasePriceUsd ?? 0)
    return sum + item.quantityPerUnit * unitCost
  }, 0)

  return total.toFixed(4)
}

export function getBaseFormulaMaterialIds(product: CatalogProduct): Set<number> {
  return new Set((product.formula?.materials ?? []).map((item) => Number(item.materialId)))
}

export function hasAddedMaterialsBeyondBase(
  baseMaterialIds: Set<number>,
  formulaMaterials: SaleLineFormulaMaterialInput[]
): boolean {
  return formulaMaterials.some(
    (item) => item.quantity_per_unit > 0 && !baseMaterialIds.has(item.material_id)
  )
}

function calcProfitMarginPercent(
  salePriceUsd: string | number,
  costUsd: string | number
): number | null {
  const sale = Number(salePriceUsd)
  const cost = Number(costUsd)

  if (!Number.isFinite(sale) || !Number.isFinite(cost) || cost <= 0) {
    return null
  }

  return ((sale - cost) / cost) * 100
}

function calcSalePriceFromMargin(costUsd: number, marginPercent: number): number | null {
  if (
    !Number.isFinite(costUsd) ||
    costUsd <= 0 ||
    !Number.isFinite(marginPercent) ||
    marginPercent < 0
  ) {
    return null
  }

  return costUsd * (1 + marginPercent / 100)
}

export async function resolveSaleLineUnitPriceUsd(
  product: CatalogProduct,
  formulaMaterialsInput: SaleLineFormulaMaterialInput[] | undefined,
  trx?: TransactionClientContract
): Promise<number> {
  const catalogPrice = Number(product.salePriceUsd)

  if (formulaMaterialsInput === undefined) {
    return catalogPrice
  }

  const baseIds = getBaseFormulaMaterialIds(product)
  if (!hasAddedMaterialsBeyondBase(baseIds, formulaMaterialsInput)) {
    return catalogPrice
  }

  const normalized = normalizeFormulaMaterialsInput(formulaMaterialsInput)!
  const materialIds = normalized.map((item) => item.materialId)
  const materialsQuery = Material.query()
  if (trx) {
    materialsQuery.useTransaction(trx)
  }
  const materials = await materialsQuery.whereIn('id', materialIds)
  const materialById = new Map(materials.map((material) => [Number(material.id), material]))

  const effectiveMaterials: EffectiveFormulaMaterial[] = normalized.map((item) => ({
    materialId: item.materialId,
    quantityPerUnit: Number(item.quantityPerUnit),
    material: materialById.get(item.materialId),
  }))

  const effectiveCost = Number(sumEffectiveMaterialCostUsd(effectiveMaterials))
  const margin = calcProfitMarginPercent(product.salePriceUsd, product.costUsd)
  if (margin === null) {
    return catalogPrice
  }

  const recalculated = calcSalePriceFromMargin(effectiveCost, margin)
  return recalculated ?? catalogPrice
}
