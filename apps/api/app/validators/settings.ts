import vine from '@vinejs/vine'

const hexColor = vine.string().trim().regex(/^#[0-9A-Fa-f]{6}$/)

export const updateExchangeRateValidator = vine.create({
  usd_rate: vine.number().positive(),
})

export const updateProfitMarginValidator = vine.create({
  profit_margin_percent: vine.number().min(0),
})

export const updateBaseCurrencyValidator = vine.create({
  base_currency_code: vine.string().trim().toUpperCase().fixedLength(3),
})

export const updateBusinessProfileValidator = vine.create({
  trade_name: vine.string().trim().minLength(1).maxLength(150),
  tagline: vine.string().trim().maxLength(200).optional(),
  ticket_footer: vine.string().trim().maxLength(300).optional(),
  legal_name: vine.string().trim().maxLength(200).optional(),
  rif: vine.string().trim().maxLength(30).optional(),
  address: vine.string().trim().maxLength(300).optional(),
  phone: vine.string().trim().maxLength(30).optional(),
  email: vine.string().trim().maxLength(120).optional(),
  website: vine.string().trim().maxLength(200).optional(),
  use_custom_palette: vine.boolean().optional(),
  palette: vine
    .object({
      primary: hexColor,
      secondary: hexColor,
      accent: hexColor,
    })
    .optional(),
})
