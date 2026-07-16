import type SaleLine from '#models/sale_line'
import { serializeFormulaMaterialItem } from '#transformers/formula_transformer'
import {
  resolveEffectiveFormulaMaterials,
} from '#services/sale_line_formula'

function serializeSaleLineFormulaMaterialItem(item: {
  materialId: bigint | number
  quantityPerUnit: string
  material?: {
    id: bigint | number
    code: string
    name: string
    unit: string
    lastPurchasePriceUsd: string | null
  }
}) {
  return {
    material_id: Number(item.materialId),
    quantity_per_unit: item.quantityPerUnit,
    material: item.material
      ? {
          id: Number(item.material.id),
          code: item.material.code,
          name: item.material.name,
          unit: item.material.unit,
          last_purchase_price_usd: item.material.lastPurchasePriceUsd,
        }
      : undefined,
  }
}

function serializeEffectiveFormulaMaterial(item: {
  materialId: number
  quantityPerUnit: number
  material?: {
    id: bigint | number
    code: string
    name: string
    unit: string
    lastPurchasePriceUsd: string | null
  }
}) {
  return {
    material_id: item.materialId,
    quantity_per_unit: item.quantityPerUnit.toFixed(3),
    material: item.material
      ? {
          id: Number(item.material.id),
          code: item.material.code,
          name: item.material.name,
          unit: item.material.unit,
          last_purchase_price_usd: item.material.lastPurchasePriceUsd,
        }
      : undefined,
  }
}

export function serializeSaleLineFormulaFields(line: SaleLine) {
  const customMaterials = line.saleLineMaterials ?? []
  const hasCustomFormula = customMaterials.length > 0
  const formulaMaterials = customMaterials.map((item) => serializeSaleLineFormulaMaterialItem(item))
  const effectiveFormulaMaterials = resolveEffectiveFormulaMaterials(
    line,
    line.catalogProduct ?? null
  ).map((item) => serializeEffectiveFormulaMaterial(item))

  return {
    formula_materials: formulaMaterials,
    has_custom_formula: hasCustomFormula,
    effective_formula_materials: effectiveFormulaMaterials,
  }
}

export function serializeSaleLineFormulaMaterialFromCatalog(item: Parameters<typeof serializeFormulaMaterialItem>[0]) {
  return {
    material_id: Number(item.materialId),
    quantity_per_unit: item.quantity,
    material: item.material
      ? {
          id: Number(item.material.id),
          code: item.material.code,
          name: item.material.name,
          unit: item.material.unit,
          last_purchase_price_usd: item.material.lastPurchasePriceUsd,
        }
      : undefined,
  }
}
