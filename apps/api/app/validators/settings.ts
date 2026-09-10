import vine from '@vinejs/vine'

const hexColor = vine
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/)

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

const printDocumentKind = vine.enum(['invoice', 'deliveryNote', 'comanda'] as const)

const printDocumentSettingsSchema = vine.object({
  enabled: vine.boolean(),
  deviceName: vine.string().trim().maxLength(200).optional().nullable(),
  paperWidthMm: vine.number().positive().max(300),
  formatId: vine.string().trim().minLength(1).maxLength(120),
})

const printFormatSchema = vine.object({
  id: vine.string().trim().minLength(1).maxLength(120),
  name: vine.string().trim().minLength(1).maxLength(200),
  documentKind: printDocumentKind,
  paperWidthMm: vine.number().positive().max(300),
  bodyHtml: vine.string().maxLength(200_000),
  isBuiltin: vine.boolean(),
})

const categoryComandaRuleSchema = vine.object({
  category: vine.string().trim().minLength(1).maxLength(120),
  deviceName: vine.string().trim().minLength(1).maxLength(200),
})

export const updatePrintConfigValidator = vine.create({
  scope: vine.enum(['devices', 'formats', 'full'] as const).optional(),
  ticket: vine
    .object({
      station_label: vine.string().trim().maxLength(120).optional().nullable(),
    })
    .optional(),
  formats: vine.array(printFormatSchema).optional(),
  documents: vine
    .object({
      invoice: printDocumentSettingsSchema,
      deliveryNote: printDocumentSettingsSchema,
      comanda: printDocumentSettingsSchema,
    })
    .optional(),
  behavior: vine
    .object({
      printInvoiceOnConfirm: vine.boolean(),
      printDeliveryNoteOnConfirm: vine.boolean(),
      printComandaOnConfirm: vine.boolean(),
      printComandaFormula: vine.boolean().optional(),
    })
    .optional(),
  categoryRouting: vine
    .object({
      comanda: vine.object({
        enabled: vine.boolean(),
        rules: vine.array(categoryComandaRuleSchema),
      }),
    })
    .optional(),
})
