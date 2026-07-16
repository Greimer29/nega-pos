import {
  BUILTIN_FORMAT_IDS,
  createBuiltinFormats,
  DEFAULT_TICKET_PAPER_WIDTH_MM,
  normalizeFormats,
  resolvePaperWidthMm,
} from './print-format-defaults'

export type PrintDocumentKind = 'invoice' | 'deliveryNote' | 'comanda'

export type PrintDocumentSettings = {
  enabled: boolean
  deviceName: string
  paperWidthMm: number
  formatId: string
}

export type CategoryComandaRule = {
  category: string
  deviceName: string
}

export type CategoryComandaRouting = {
  enabled: boolean
  rules: CategoryComandaRule[]
}

export type PrintFormatRecord = {
  id: string
  name: string
  documentKind: PrintDocumentKind
  paperWidthMm: number
  bodyHtml: string
  isBuiltin: boolean
}

export type PrintConfig = {
  business: {
    name: string
    subtitle: string
    footer: string
  }
  ticket: {
    station_label: string
  }
  formats: PrintFormatRecord[]
  documents: {
    invoice: PrintDocumentSettings
    deliveryNote: PrintDocumentSettings
    comanda: PrintDocumentSettings
  }
  behavior: {
    printInvoiceOnConfirm: boolean
    printDeliveryNoteOnConfirm: boolean
    printComandaOnConfirm: boolean
    printComandaFormula?: boolean
  }
  categoryRouting: {
    comanda: CategoryComandaRouting
  }
}

type LegacyPrintConfig = Partial<PrintConfig> & {
  categoryRouting?: {
    comanda?: CategoryComandaRouting
    deliveryNote?: CategoryComandaRouting
  }
  behavior?: PrintConfig['behavior'] & {
    printComandaOnConfirm?: boolean
  }
}

export const DEFAULT_PRINT_CONFIG: PrintConfig = {
  business: {
    name: '',
    subtitle: '',
    footer: 'Gracias por su compra',
  },
  ticket: {
    station_label: '',
  },
  formats: createBuiltinFormats(),
  documents: {
    invoice: {
      enabled: true,
      deviceName: '',
      paperWidthMm: DEFAULT_TICKET_PAPER_WIDTH_MM,
      formatId: BUILTIN_FORMAT_IDS.invoice,
    },
    deliveryNote: {
      enabled: false,
      deviceName: '',
      paperWidthMm: DEFAULT_TICKET_PAPER_WIDTH_MM,
      formatId: BUILTIN_FORMAT_IDS.deliveryNote,
    },
    comanda: {
      enabled: false,
      deviceName: '',
      paperWidthMm: DEFAULT_TICKET_PAPER_WIDTH_MM,
      formatId: BUILTIN_FORMAT_IDS.comanda,
    },
  },
  behavior: {
    printInvoiceOnConfirm: true,
    printDeliveryNoteOnConfirm: false,
    printComandaOnConfirm: false,
    printComandaFormula: false,
  },
  categoryRouting: {
    comanda: {
      enabled: false,
      rules: [],
    },
  },
}

export function normalizePrintConfig(input: LegacyPrintConfig | null | undefined): PrintConfig {
  const base = structuredClone(DEFAULT_PRINT_CONFIG)

  if (!input) {
    return base
  }

  if (input.business) {
    base.business.name = String(input.business.name ?? base.business.name).trim() || base.business.name
    base.business.subtitle = String(input.business.subtitle ?? '').trim()
    base.business.footer = String(input.business.footer ?? base.business.footer).trim()
  }

  if (input.ticket) {
    base.ticket.station_label = String(input.ticket.station_label ?? '').trim()
  }

  base.formats = normalizeFormats(input.formats)

  for (const kind of ['invoice', 'deliveryNote', 'comanda'] as const) {
    const doc = input.documents?.[kind]
    if (!doc) continue
    const formatId = String(doc.formatId ?? base.documents[kind].formatId).trim()
    base.documents[kind] = {
      enabled: doc.enabled ?? base.documents[kind].enabled,
      deviceName: String(doc.deviceName ?? '').trim(),
      paperWidthMm: resolvePaperWidthMm(doc.paperWidthMm),
      formatId: base.formats.some((format) => format.id === formatId)
        ? formatId
        : BUILTIN_FORMAT_IDS[kind],
    }
  }

  const legacyRouting = input.categoryRouting?.deliveryNote
  const comandaRouting = input.categoryRouting?.comanda ?? legacyRouting
  if (comandaRouting) {
    base.categoryRouting.comanda.enabled =
      comandaRouting.enabled ?? base.categoryRouting.comanda.enabled

    const seen = new Set<string>()
    const rules: CategoryComandaRule[] = []
    for (const rule of comandaRouting.rules ?? []) {
      const category = String(rule.category ?? '').trim()
      const deviceName = String(rule.deviceName ?? '').trim()
      if (
        !category ||
        !deviceName ||
        seen.has(category) ||
        category.toLocaleLowerCase('es-VE') === 'materiales'
      ) {
        continue
      }
      seen.add(category)
      rules.push({ category, deviceName })
    }
    base.categoryRouting.comanda.rules = rules
  }

  if (input.behavior) {
    base.behavior.printInvoiceOnConfirm =
      input.behavior.printInvoiceOnConfirm ?? base.behavior.printInvoiceOnConfirm
    base.behavior.printDeliveryNoteOnConfirm =
      input.behavior.printDeliveryNoteOnConfirm ?? base.behavior.printDeliveryNoteOnConfirm

    const legacyComandaOnConfirm =
      legacyRouting?.enabled === true && input.behavior.printDeliveryNoteOnConfirm === true
    base.behavior.printComandaOnConfirm =
      input.behavior.printComandaOnConfirm ??
      (legacyComandaOnConfirm ? true : base.behavior.printComandaOnConfirm)

    base.behavior.printComandaFormula =
      input.behavior.printComandaFormula ?? base.behavior.printComandaFormula
  }

  return base
}
