import vine from '@vinejs/vine'

export const createOrderLineValidator = vine.create({
  catalog_product_id: vine.number().min(1),
  quantity: vine.number().min(0.001),
})

export const updateOrderLineValidator = vine.create({
  quantity: vine.number().min(0.001),
})
