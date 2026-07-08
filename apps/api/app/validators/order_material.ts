import vine from '@vinejs/vine'

export const createOrderMaterialValidator = vine.create({
  material_id: vine.number().min(1),
  quantity_per_garment: vine.number().positive(),
  notes: vine.string().trim().maxLength(255).optional(),
})

export const updateOrderMaterialValidator = vine.create({
  material_id: vine.number().min(1).optional(),
  quantity_per_garment: vine.number().positive().optional(),
  notes: vine.string().trim().maxLength(255).optional(),
})
