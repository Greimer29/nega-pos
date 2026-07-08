import vine from '@vinejs/vine'

const statuss = ['DRAFT', 'CONFIRMED', 'VOIDED'] as const

const isoDate = vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const purchaseFields = {
  supplier_id: vine.number().min(1).optional(),
  date: isoDate,
  date_recepcion: isoDate.optional(),
  invoice_number: vine.string().trim().maxLength(50).optional(),
  usd_rate: vine.number().positive().optional(),
  notes: vine.string().trim().optional(),
  account_id: vine.number().min(1).nullable().optional(),
  is_credit: vine.boolean().optional(),
  credit_due_date: isoDate.optional(),
}

export const createPurchaseValidator = vine.create({
  ...purchaseFields,
})

export const updatePurchaseValidator = vine.create({
  ...purchaseFields,
})

export const listPurchasesValidator = vine.create({
  page: vine.number().min(1).optional(),
  per_page: vine.number().min(1).max(100).optional(),
  supplier_id: vine.number().min(1).optional(),
  status: vine.enum(statuss).optional(),
  date_desde: isoDate.optional(),
  date_hasta: isoDate.optional(),
  account_id: vine.number().min(1).optional(),
  unassigned: vine.boolean().optional(),
})

const purchaseItemFields = {
  material_id: vine.number().min(1).optional(),
  catalog_product_id: vine.number().min(1).optional(),
  quantity: vine.number().positive(),
  unit_price_usd: vine.number().min(0),
}

export const createPurchaseItemValidator = vine.create({
  ...purchaseItemFields,
  unit_price_bs: vine.number().min(0).optional(),
})

export const updatePurchaseItemValidator = vine.create({
  material_id: vine.number().min(1).optional(),
  catalog_product_id: vine.number().min(1).optional(),
  quantity: vine.number().positive().optional(),
  unit_price_usd: vine.number().min(0).optional(),
  unit_price_bs: vine.number().min(0).optional(),
})

export const confirmPurchaseValidator = vine.create({
  supplier_id: vine.number().min(1).optional(),
  date: isoDate.optional(),
  date_recepcion: isoDate.optional(),
  invoice_number: vine.string().trim().maxLength(50).optional(),
  usd_rate: vine.number().positive().optional(),
  notes: vine.string().trim().optional(),
  account_id: vine.number().min(1).nullable().optional(),
  is_credit: vine.boolean().optional(),
  credit_due_date: isoDate.optional(),
  items: vine.array(vine.object(purchaseItemFields)).minLength(1).optional(),
})
