import vine from '@vinejs/vine'

const paymentMethodCode = vine
  .string()
  .trim()
  .minLength(2)
  .maxLength(50)
  .regex(/^[a-z][a-z0-9_]*$/)

export const createPaymentMethodValidator = vine.create({
  code: paymentMethodCode,
  name: vine.string().trim().minLength(1).maxLength(100),
  currency_code: vine.string().trim().toUpperCase().fixedLength(3),
  is_active: vine.boolean().optional(),
  sort_order: vine.number().min(0).optional(),
})

export const updatePaymentMethodValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(100).optional(),
  currency_code: vine.string().trim().toUpperCase().fixedLength(3).optional(),
  is_active: vine.boolean().optional(),
  sort_order: vine.number().min(0).optional(),
})

export const listPaymentMethodsValidator = vine.create({
  active: vine.boolean().optional(),
})
