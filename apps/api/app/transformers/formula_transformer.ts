import type Formula from '#models/formula'
import type FormulaMaterial from '#models/formula_material'
import type Material from '#models/material'

export function serializeFormula(formula: Formula, extras?: { productsCount?: number }) {
  return {
    id: Number(formula.id),
    name: formula.name,
    description: formula.description,
    active: formula.active,
    products_count: extras?.productsCount,
    created_at: formula.createdAt.toISO(),
    updated_at: formula.updatedAt.toISO(),
  }
}

export function serializeFormulaDetail(formula: Formula, extras?: { productsCount?: number }) {
  return {
    ...serializeFormula(formula, extras),
    materials: formula.materials?.map((item) => serializeFormulaMaterialItem(item)) ?? [],
  }
}

export function serializeFormulaMaterialItem(item: FormulaMaterial) {
  return {
    id: Number(item.id),
    material_id: Number(item.materialId),
    quantity: item.quantity,
    material: item.material ? serializeMaterialRef(item.material) : undefined,
  }
}

function serializeMaterialRef(material: Material) {
  return {
    id: Number(material.id),
    code: material.code,
    name: material.name,
    unit: material.unit,
    last_purchase_price_usd: material.lastPurchasePriceUsd,
  }
}
