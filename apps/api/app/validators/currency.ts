import vine from '@vinejs/vine'

const currencyCode = vine.string().trim().toUpperCase().fixedLength(3)

export const createCurrencyValidator = vine.create({
  code: currencyCode,
  name: vine.string().trim().minLength(1).maxLength(64),
  rate_per_usd: vine.number().positive(),
  is_active: vine.boolean().optional(),
})

export const updateCurrencyValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(64).optional(),
  rate_per_usd: vine.number().positive().optional(),
  is_active: vine.boolean().optional(),
})

export const listCurrenciesValidator = vine.create({
  active: vine.boolean().optional(),
})
