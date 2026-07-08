import vine from '@vinejs/vine'

export const listCategoriesValidator = vine.create({
  active_only: vine.boolean().optional(),
})

export const createCategoryValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(100),
  sort_order: vine.number().min(0).optional(),
})

export const updateCategoryValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(100).optional(),
  active: vine.boolean().optional(),
  sort_order: vine.number().min(0).optional(),
})
