import vine from '@vinejs/vine'

const MODALIDADES = ['WHITE_LABEL', 'CORPORATE'] as const
const ESTADOS = [
  'DRAFT',
  'CONFIRMED',
  'IN_PRODUCTION',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
] as const
const ESTADOS_TRANSICION = ['CONFIRMED', 'IN_PRODUCTION', 'DELIVERED', 'CANCELLED'] as const
const DIRECTION = ['asc', 'desc'] as const

const isoDate = vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const orderFields = {
  customer_id: vine.number().min(1).optional(),
  guest_name: vine.string().trim().maxLength(150).optional(),
  modality: vine.enum(MODALIDADES),
  description: vine.string().trim().minLength(1),
  total_quantity: vine.number().min(1),
  order_date: isoDate,
  estimated_delivery_date: isoDate.optional(),
  total_price: vine.number().min(0).optional(),
  notes: vine.string().trim().optional(),
  payment_type: vine.enum(['CASH', 'CREDIT'] as const).optional(),
}

const orderLineFields = vine.object({
  catalog_product_id: vine.number().min(1),
  quantity: vine.number().min(0.001),
})

export const createOrderValidator = vine.create({
  ...orderFields,
  lines: vine.array(orderLineFields).minLength(1).optional(),
})

export const updateOrderValidator = vine.create({
  ...orderFields,
  lines: vine.array(orderLineFields).minLength(1).optional(),
})

export const listOrdersValidator = vine.create({
  page: vine.number().min(1).optional(),
  per_page: vine.number().min(1).max(100).optional(),
  customer_id: vine.number().min(1).optional(),
  status: vine.enum(ESTADOS).optional(),
  exclude_status: vine.enum(ESTADOS).optional(),
  modality: vine.enum(MODALIDADES).optional(),
  date_from: isoDate.optional(),
  date_to: isoDate.optional(),
  search: vine.string().trim().maxLength(150).optional(),
  sort_by: vine.enum(['order_date', 'code', 'created_at', 'confirmed_at'] as const).optional(),
  direction: vine.enum(DIRECTION).optional(),
})

export const transitionOrderValidator = vine.create({
  new_status: vine.enum(ESTADOS_TRANSICION),
  force: vine.boolean().optional(),
  payment_type: vine.enum(['CASH', 'CREDIT'] as const).optional(),
})

export const returnOrderValidator = vine.create({
  lines: vine
    .array(
      vine.object({
        line_id: vine.number().min(1),
        quantity: vine.number().positive(),
      })
    )
    .minLength(1)
    .optional(),
})
