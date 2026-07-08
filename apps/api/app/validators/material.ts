import { INVENTORY_UNITS } from '#constants/inventory_units'
import { INVENTORY_ADJUSTMENT_MODES } from '#constants/inventory_adjustment'
import vine from '@vinejs/vine'

const categories = ['FABRIC', 'THREAD', 'BUTTON', 'ELASTIC', 'LABEL', 'BAG', 'OTHER'] as const
const statusFilters = ['active', 'inactive', 'out_of_stock'] as const
const sortByOptions = ['name', 'most_purchased', 'most_used', 'most_flow'] as const

const materialFields = {
  code: vine.string().trim().minLength(1).maxLength(30),
  name: vine.string().trim().minLength(1).maxLength(150),
  description: vine.string().trim().optional(),
  category: vine.enum(categories),
  unit: vine.enum(INVENTORY_UNITS),
  minimum_stock: vine.number().min(0).optional(),
  location: vine.string().trim().maxLength(100).optional(),
  default_supplier_id: vine.number().min(1).optional(),
  last_purchase_price_usd: vine.number().min(0).optional(),
}

export const createMaterialValidator = vine.create({
  ...materialFields,
})

export const updateMaterialValidator = vine.create({
  ...materialFields,
  active: vine.boolean().optional(),
})

export const listMaterialsValidator = vine.create({
  page: vine.number().min(1).optional(),
  per_page: vine.number().min(1).max(100).optional(),
  search: vine.string().trim().maxLength(150).optional(),
  category: vine.enum(categories).optional(),
  active: vine.boolean().optional(),
  low_stock: vine.boolean().optional(),
  status: vine.enum(statusFilters).optional(),
  sort_by: vine.enum(sortByOptions).optional(),
  sort_dir: vine.enum(['asc', 'desc'] as const).optional(),
})

export const ajusteMaterialValidator = vine.create({
  mode: vine.enum(INVENTORY_ADJUSTMENT_MODES),
  quantity: vine.number().min(0),
  note: vine.string().trim().maxLength(255).optional(),
})
