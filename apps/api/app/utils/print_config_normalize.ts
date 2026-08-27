import type {
  CategoryComandaRule,
  PrintBusinessConfig,
  PrintConfig,
  PrintConfigPatch,
  PrintConfigSaveScope,
  StoredPrintConfig,
} from '#types/print_config'
import {
  BUILTIN_FORMAT_IDS,
  createBuiltinFormats,
  DEFAULT_TICKET_PAPER_WIDTH_MM,
  normalizeFormats,
  resolvePaperWidthMm,
} from '#utils/print_format_defaults'

export const EMPTY_PRINT_BUSINESS: PrintBusinessConfig = {
  name: '',
  subtitle: '',
  footer: 'Gracias por su compra',
  legalName: '',
  rif: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  hasLogo: false,
}

export function createDefaultStoredPrintConfig(): StoredPrintConfig {
  return {
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
}

function sanitizeComandaRules(rules: CategoryComandaRule[] | undefined): CategoryComandaRule[] {
  const seen = new Set<string>()
  const sanitized: CategoryComandaRule[] = []

  for (const rule of rules ?? []) {
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
    sanitized.push({ category, deviceName })
  }

  return sanitized
}

type LegacyStoredPrintConfig = Partial<StoredPrintConfig> & {
  business?: unknown
  categoryRouting?: {
    comanda?: StoredPrintConfig['categoryRouting']['comanda']
    deliveryNote?: StoredPrintConfig['categoryRouting']['comanda']
  }
  behavior?: StoredPrintConfig['behavior'] & {
    printComandaOnConfirm?: boolean
  }
}

export function normalizeStoredPrintConfig(
  input: LegacyStoredPrintConfig | null | undefined
): StoredPrintConfig {
  const base = createDefaultStoredPrintConfig()

  if (!input) {
    return base
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
    base.categoryRouting.comanda.rules = sanitizeComandaRules(comandaRouting.rules)
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

export function mergePrintConfigPatch(
  current: StoredPrintConfig,
  patch: PrintConfigPatch,
  scope: PrintConfigSaveScope = patch.scope ?? 'full'
): StoredPrintConfig {
  if (scope === 'formats') {
    const next = structuredClone(current)
    if (patch.formats) {
      next.formats = normalizeFormats(patch.formats)
    }
    if (patch.documents) {
      for (const kind of ['invoice', 'deliveryNote', 'comanda'] as const) {
        const doc = patch.documents[kind]
        if (!doc) continue
        const formatId = String(doc.formatId ?? next.documents[kind].formatId).trim()
        next.documents[kind] = {
          ...next.documents[kind],
          formatId: next.formats.some((format) => format.id === formatId)
            ? formatId
            : BUILTIN_FORMAT_IDS[kind],
          paperWidthMm: resolvePaperWidthMm(doc.paperWidthMm ?? next.documents[kind].paperWidthMm),
        }
      }
    }
    return next
  }

  if (scope === 'devices') {
    const next = structuredClone(current)
    if (patch.ticket) {
      next.ticket.station_label = String(patch.ticket.station_label ?? '').trim()
    }
    if (patch.documents) {
      for (const kind of ['invoice', 'deliveryNote', 'comanda'] as const) {
        const doc = patch.documents[kind]
        if (!doc) continue
        next.documents[kind] = {
          ...next.documents[kind],
          enabled: doc.enabled ?? next.documents[kind].enabled,
          deviceName: String(doc.deviceName ?? next.documents[kind].deviceName).trim(),
        }
      }
    }
    if (patch.behavior) {
      next.behavior = {
        printInvoiceOnConfirm:
          patch.behavior.printInvoiceOnConfirm ?? next.behavior.printInvoiceOnConfirm,
        printDeliveryNoteOnConfirm:
          patch.behavior.printDeliveryNoteOnConfirm ?? next.behavior.printDeliveryNoteOnConfirm,
        printComandaOnConfirm:
          patch.behavior.printComandaOnConfirm ?? next.behavior.printComandaOnConfirm,
        printComandaFormula:
          patch.behavior.printComandaFormula ?? next.behavior.printComandaFormula,
      }
    }
    if (patch.categoryRouting?.comanda) {
      next.categoryRouting.comanda = {
        enabled: patch.categoryRouting.comanda.enabled ?? next.categoryRouting.comanda.enabled,
        rules: sanitizeComandaRules(patch.categoryRouting.comanda.rules),
      }
    }
    return next
  }

  return normalizeStoredPrintConfig({
    ...current,
    ...patch,
    documents: patch.documents ?? current.documents,
    formats: patch.formats ?? current.formats,
    behavior: patch.behavior ?? current.behavior,
    ticket: patch.ticket ?? current.ticket,
    categoryRouting: patch.categoryRouting ?? current.categoryRouting,
  })
}

export function withPrintBusiness(
  stored: StoredPrintConfig,
  business: PrintBusinessConfig
): PrintConfig {
  return {
    business,
    ...stored,
  }
}
