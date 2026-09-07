import vine from '@vinejs/vine'

const saleLineSchema = vine.object({
  catalog_product_id: vine.number().min(1).optional(),
  material_id: vine.number().min(1).optional(),
  quantity: vine.number().min(0.001),
  unit_price_usd: vine.number().min(0),
  kitchen_note: vine.string().trim().maxLength(1000).nullable().optional(),
  formula_materials: vine
    .array(
      vine.object({
        material_id: vine.number().min(1),
        quantity_per_unit: vine.number().min(0),
      })
    )
    .optional(),
})

export const createSaleValidator = vine.create({
  customer_id: vine.number().min(1).optional(),
  guest_name: vine.string().trim().maxLength(150).optional(),
  payment_method_code: vine.string().trim().maxLength(50).optional(),
  payment_type: vine.enum(['CASH', 'CREDIT']).optional(),
  billing_mode: vine.enum(['FAST', 'ORDER']).optional(),
  usd_rate: vine.number().min(0).optional(),
  confirm: vine.boolean().optional(),
  discount_usd: vine.number().min(0).optional(),
  lines: vine.array(saleLineSchema).minLength(1),
})

export const updateSaleValidator = vine.create({
  customer_id: vine.number().min(1).optional().nullable(),
  guest_name: vine.string().trim().maxLength(150).optional().nullable(),
  payment_method_code: vine.string().trim().maxLength(50).optional().nullable(),
  payment_type: vine.enum(['CASH', 'CREDIT']).optional(),
  billing_mode: vine.enum(['FAST', 'ORDER']).optional(),
  usd_rate: vine.number().min(0).optional().nullable(),
  discount_usd: vine.number().min(0).optional(),
  lines: vine.array(saleLineSchema).minLength(1).optional(),
})

export const confirmSaleValidator = vine.create({
  payment_method_code: vine.string().trim().maxLength(50).optional(),
  payment_type: vine.enum(['CASH', 'CREDIT']).optional(),
  billing_mode: vine.enum(['FAST', 'ORDER']).optional(),
  currency_code: vine.string().trim().toUpperCase().fixedLength(3).optional(),
  usd_rate: vine.number().positive().optional(),
})

export const transitionSaleValidator = vine.create({
  order_status: vine.enum(['IN_PROCESS', 'DELIVERED']),
})

export const returnSaleValidator = vine.create({
  lines: vine
    .array(
      vine.object({
        line_id: vine.number().min(1),
        quantity: vine.number().min(0.001),
      })
    )
    .optional(),
})

export const listSalesValidator = vine.create({
  page: vine.number().min(1).optional(),
  per_page: vine.number().min(1).max(100).optional(),
  customer_id: vine.number().min(1).optional(),
  status: vine.enum(['DRAFT', 'COMPLETED', 'RETURNED']).optional(),
  exclude_status: vine.enum(['DRAFT', 'COMPLETED', 'RETURNED']).optional(),
  search: vine.string().trim().maxLength(120).optional(),
  date_from: vine.string().trim().optional(),
  date_to: vine.string().trim().optional(),
})
