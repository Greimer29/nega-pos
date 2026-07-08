import vine from '@vinejs/vine'

const TIPOS_CLIENTE = ['WHITE_LABEL', 'CORPORATE', 'OTHER'] as const

const customerFields = {
  name: vine.string().trim().minLength(1).maxLength(150),
  phone: vine.string().trim().maxLength(20).optional(),
  email: vine.string().trim().email().maxLength(150).optional(),
  type: vine.enum(TIPOS_CLIENTE).optional(),
  document: vine.string().trim().maxLength(30).optional(),
  address: vine.string().trim().maxLength(255).optional(),
  notes: vine.string().trim().optional(),
  credit_days: vine.number().min(0).max(365).nullable().optional(),
}

export const createCustomerValidator = vine.create({
  ...customerFields,
})

export const updateCustomerValidator = vine.create({
  ...customerFields,
  active: vine.boolean().optional(),
})

export const listCustomersValidator = vine.create({
  page: vine.number().min(1).optional(),
  per_page: vine.number().min(1).max(100).optional(),
  search: vine.string().trim().maxLength(150).optional(),
  type: vine.enum(TIPOS_CLIENTE).optional(),
  active: vine.boolean().optional(),
})
