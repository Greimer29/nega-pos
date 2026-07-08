import vine from '@vinejs/vine'

export const createFormulaValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(150),
  description: vine.string().trim().optional(),
  active: vine.boolean().optional(),
})

export const updateFormulaValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(150).optional(),
  description: vine.string().trim().optional(),
  active: vine.boolean().optional(),
})

export const listFormulasValidator = vine.create({
  page: vine.number().min(1).optional(),
  per_page: vine.number().min(1).max(100).optional(),
  search: vine.string().trim().maxLength(150).optional(),
  active: vine.boolean().optional(),
})

export const updateFormulaMaterialsValidator = vine.create({
  items: vine
    .array(
      vine.object({
        material_id: vine.number().min(1),
        quantity: vine.number().min(0.001),
      })
    )
    .minLength(0),
})
