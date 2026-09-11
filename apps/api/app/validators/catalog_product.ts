import { INVENTORY_UNITS } from '#constants/inventory_units'
import { CATALOG_ITEM_KINDS } from '#constants/catalog_item_kind'
import { INVENTORY_ADJUSTMENT_MODES } from '#constants/inventory_adjustment'
import vine from '@vinejs/vine'

const sizeRowSchema = vine.object({
  size: vine.string().trim().minLength(1).maxLength(20),
  stock_quantity: vine.number().min(0),
})

const catalogProductFields = {
  name: vine.string().trim().minLength(1).maxLength(150),
  description: vine.string().trim().optional(),
  category: vine.string().trim().minLength(1).maxLength(100),
  item_kind: vine.enum(CATALOG_ITEM_KINDS).optional(),
  sale_unit: vine.enum(INVENTORY_UNITS).optional(),
  sale_price_usd: vine.number().min(0),
  cost_usd: vine.number().min(0).optional(),
  formula_id: vine.number().min(1).nullable().optional(),
  stock_quantity: vine.number().min(0).optional(),
  minimum_stock: vine.number().min(0).optional(),
  sizes: vine.array(sizeRowSchema).optional(),
}

export const createCatalogProductValidator = vine.create({
  ...catalogProductFields,
})

export const updateCatalogProductValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(150).optional(),
  description: vine.string().trim().optional(),
  category: vine.string().trim().minLength(1).maxLength(100).optional(),
  item_kind: vine.enum(CATALOG_ITEM_KINDS).optional(),
  sale_unit: vine.enum(INVENTORY_UNITS).optional(),
  sale_price_usd: vine.number().min(0).optional(),
  cost_usd: vine.number().min(0).optional(),
  formula_id: vine.number().min(1).nullable().optional(),
  stock_quantity: vine.number().min(0).optional(),
  minimum_stock: vine.number().min(0).optional(),
  active: vine.boolean().optional(),
  sizes: vine.array(sizeRowSchema).optional(),
})

export const replaceCatalogProductSizesValidator = vine.create({
  sizes: vine.array(sizeRowSchema),
})

export const listCatalogProductsValidator = vine.create({
  page: vine.number().min(1).optional(),
  per_page: vine.number().min(1).max(100).optional(),
  search: vine.string().trim().maxLength(150).optional(),
  category: vine.string().trim().maxLength(100).optional(),
  size: vine.string().trim().maxLength(20).optional(),
  active: vine.boolean().optional(),
  item_kind: vine.enum(CATALOG_ITEM_KINDS).optional(),
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
  catalog_product_size_id: vine.number().min(1).nullable().optional(),
})

export const bulkAjusteCatalogProductValidator = vine.create({
  mode: vine.enum(INVENTORY_ADJUSTMENT_MODES),
  note: vine.string().trim().maxLength(255).optional(),
  items: vine
    .array(
      vine.object({
        catalog_product_id: vine.number().min(1),
        catalog_product_size_id: vine.number().min(1).nullable().optional(),
        quantity: vine.number().min(0),
      })
    )
    .minLength(1)
    .maxLength(200),
})

export const importCatalogProductsValidator = vine.create({
  item_kind: vine.enum(CATALOG_ITEM_KINDS),
  rows: vine
    .array(
      vine.object({
        row: vine.number().min(1),
        name: vine.string().trim().maxLength(150).optional(),
        category: vine.string().trim().maxLength(100).optional(),
        description: vine.string().trim().maxLength(2000).optional(),
        sale_unit: vine.string().trim().maxLength(10).optional(),
        sale_price_usd: vine.number().min(0).optional(),
        cost_usd: vine.number().min(0).optional(),
        stock_quantity: vine.number().min(0).optional(),
        minimum_stock: vine.number().min(0).optional(),
      })
    )
    .minLength(1)
    .maxLength(200),
})
