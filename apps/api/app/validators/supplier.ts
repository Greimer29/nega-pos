import vine from '@vinejs/vine'

const supplierFields = {
  name: vine.string().trim().minLength(1).maxLength(150),
  rif: vine.string().trim().maxLength(20).optional(),
  phone: vine.string().trim().maxLength(20).optional(),
  email: vine.string().trim().email().maxLength(150).optional(),
  notes: vine.string().trim().optional(),
  credit_days: vine.number().min(0).max(365).nullable().optional(),
}

export const createSupplierValidator = vine.create({
  ...supplierFields,
})

export const updateSupplierValidator = vine.create({
  ...supplierFields,
  active: vine.boolean().optional(),
})

export const listSuppliersValidator = vine.create({
  page: vine.number().min(1).optional(),
  per_page: vine.number().min(1).max(100).optional(),
  search: vine.string().trim().maxLength(150).optional(),
  active: vine.boolean().optional(),
})
