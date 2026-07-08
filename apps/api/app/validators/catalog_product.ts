import { INVENTORY_UNITS } from '#constants/inventory_units'
import { INVENTORY_ADJUSTMENT_MODES } from '#constants/inventory_adjustment'
import vine from '@vinejs/vine'

const catalogProductFields = {
  name: vine.string().trim().minLength(1).maxLength(150),
  description: vine.string().trim().optional(),
  category: vine.string().trim().minLength(1).maxLength(100),
  sale_unit: vine.enum(INVENTORY_UNITS).optional(),
  sale_price_usd: vine.number().min(0),
  cost_usd: vine.number().min(0).optional(),
  formula_id: vine.number().min(1).nullable().optional(),
  stock_quantity: vine.number().min(0).optional(),
  minimum_stock: vine.number().min(0).optional(),
}

export const createCatalogProductValidator = vine.create({
  ...catalogProductFields,
})

export const updateCatalogProductValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(150).optional(),
  description: vine.string().trim().optional(),
  category: vine.string().trim().minLength(1).maxLength(100).optional(),
  sale_unit: vine.enum(INVENTORY_UNITS).optional(),
  sale_price_usd: vine.number().min(0).optional(),
  cost_usd: vine.number().min(0).optional(),
  formula_id: vine.number().min(1).nullable().optional(),
  stock_quantity: vine.number().min(0).optional(),
  minimum_stock: vine.number().min(0).optional(),
  active: vine.boolean().optional(),
})

export const listCatalogProductsValidator = vine.create({
  page: vine.number().min(1).optional(),
  per_page: vine.number().min(1).max(100).optional(),
  search: vine.string().trim().maxLength(150).optional(),
  category: vine.string().trim().maxLength(100).optional(),
  active: vine.boolean().optional(),
  sort_by: vine.enum(['name', 'most_sold'] as const).optional(),
  sort_dir: vine.enum(['asc', 'desc'] as const).optional(),
})

export const applyCatalogProfitMarginValidator = vine.create({
  catalog_product_ids: vine.array(vine.number().min(1)).minLength(1),
  profit_margin_percent: vine.number().min(0),
})

export const ajusteCatalogProductValidator = vine.create({
  mode: vine.enum(INVENTORY_ADJUSTMENT_MODES),
  quantity: vine.number().min(0),
  note: vine.string().trim().maxLength(255).optional(),
})
