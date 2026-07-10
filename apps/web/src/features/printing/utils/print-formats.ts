import type { PrintDocumentKind, PrintFormatRecord } from '@/features/printing/types'
import {
  BUILTIN_COMANDA_FORMAT_ID,
  BUILTIN_DELIVERY_NOTE_FORMAT_ID,
  BUILTIN_FORMAT_IDS,
  BUILTIN_INVOICE_FORMAT_ID,
  DEFAULT_COMANDA_BODY_HTML,
  DEFAULT_DELIVERY_NOTE_BODY_HTML,
  DEFAULT_INVOICE_BODY_HTML,
  DEFAULT_TICKET_PAPER_WIDTH_MM,
  migrateBuiltinBodyHtml,
  resolvePaperWidthMm,
} from '@/features/printing/utils/print-format-defaults'

export function createBuiltinFormats(): PrintFormatRecord[] {
  return [
    {
      id: BUILTIN_INVOICE_FORMAT_ID,
      name: 'Factura / Recibo (predeterminado)',
      documentKind: 'invoice',
      paperWidthMm: DEFAULT_TICKET_PAPER_WIDTH_MM,
      bodyHtml: DEFAULT_INVOICE_BODY_HTML,
      isBuiltin: true,
    },
    {
      id: BUILTIN_DELIVERY_NOTE_FORMAT_ID,
      name: 'Nota de despacho (predeterminado)',
      documentKind: 'deliveryNote',
      paperWidthMm: DEFAULT_TICKET_PAPER_WIDTH_MM,
      bodyHtml: DEFAULT_DELIVERY_NOTE_BODY_HTML,
      isBuiltin: true,
    },
    {
      id: BUILTIN_COMANDA_FORMAT_ID,
      name: 'Comanda (predeterminado)',
      documentKind: 'comanda',
      paperWidthMm: DEFAULT_TICKET_PAPER_WIDTH_MM,
      bodyHtml: DEFAULT_COMANDA_BODY_HTML,
      isBuiltin: true,
    },
  ]
}

export function createFormatId(): string {
  return `format-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function formatsForDocumentKind(
  formats: PrintFormatRecord[],
  documentKind: PrintDocumentKind
): PrintFormatRecord[] {
  return formats.filter((format) => format.documentKind === documentKind)
}

export function resolveFormatForDocument(
  formats: PrintFormatRecord[],
  documentKind: PrintDocumentKind,
  formatId?: string
): PrintFormatRecord {
  const builtins = createBuiltinFormats()
  const builtin = builtins.find((item) => item.id === BUILTIN_FORMAT_IDS[documentKind])!

  if (!formatId) {
    return formats.find((item) => item.id === BUILTIN_FORMAT_IDS[documentKind]) ?? builtin
  }

  return formats.find((item) => item.id === formatId) ?? builtin
}

export function duplicateFormat(
  source: PrintFormatRecord,
  formats: PrintFormatRecord[]
): PrintFormatRecord {
  const baseName = `${source.name} (copia)`
  let name = baseName
  let suffix = 2
  while (formats.some((format) => format.name.toLowerCase() === name.toLowerCase())) {
    name = `${baseName} ${suffix}`
    suffix += 1
  }

  return {
    id: createFormatId(),
    name,
    documentKind: source.documentKind,
    paperWidthMm: source.paperWidthMm,
    bodyHtml: source.bodyHtml,
    isBuiltin: false,
  }
}

export function createBlankFormat(documentKind: PrintDocumentKind): PrintFormatRecord {
  const templates: Record<PrintDocumentKind, string> = {
    invoice: DEFAULT_INVOICE_BODY_HTML,
    deliveryNote: DEFAULT_DELIVERY_NOTE_BODY_HTML,
    comanda: DEFAULT_COMANDA_BODY_HTML,
  }
  const names: Record<PrintDocumentKind, string> = {
    invoice: 'Nuevo formato de factura',
    deliveryNote: 'Nuevo formato de nota',
    comanda: 'Nuevo formato de comanda',
  }

  return {
    id: createFormatId(),
    name: names[documentKind],
    documentKind,
    paperWidthMm: DEFAULT_TICKET_PAPER_WIDTH_MM,
    bodyHtml: templates[documentKind],
    isBuiltin: false,
  }
}

export function normalizeFormats(input: PrintFormatRecord[] | undefined): PrintFormatRecord[] {
  const builtins = createBuiltinFormats()
  const byId = new Map<string, PrintFormatRecord>()

  for (const builtin of builtins) {
    byId.set(builtin.id, { ...builtin })
  }

  for (const raw of input ?? []) {
    const id = String(raw.id ?? '').trim()
    if (!id) continue

    const documentKind: PrintDocumentKind =
      raw.documentKind === 'deliveryNote'
        ? 'deliveryNote'
        : raw.documentKind === 'comanda'
          ? 'comanda'
          : 'invoice'
    const existingBuiltin = byId.get(id)
    const rawBodyHtml = String(raw.bodyHtml ?? existingBuiltin?.bodyHtml ?? '').trim()
    const defaultBodyHtml = existingBuiltin?.bodyHtml ?? DEFAULT_INVOICE_BODY_HTML
    const bodyHtml = migrateBuiltinBodyHtml(id, rawBodyHtml || defaultBodyHtml, defaultBodyHtml)
    const name = String(raw.name ?? existingBuiltin?.name ?? 'Formato sin nombre').trim()

    byId.set(id, {
      id,
      name: name || 'Formato sin nombre',
      documentKind,
      paperWidthMm: resolvePaperWidthMm(raw.paperWidthMm),
      bodyHtml,
      isBuiltin:
        id === BUILTIN_INVOICE_FORMAT_ID ||
        id === BUILTIN_DELIVERY_NOTE_FORMAT_ID ||
        id === BUILTIN_COMANDA_FORMAT_ID,
    })
  }

  return Array.from(byId.values())
}

export function removeFormat(
  formats: PrintFormatRecord[],
  formatId: string
): { formats: PrintFormatRecord[]; removed: boolean } {
  const target = formats.find((format) => format.id === formatId)
  if (!target || target.isBuiltin) {
    return { formats, removed: false }
  }

  return {
    formats: formats.filter((format) => format.id !== formatId),
    removed: true,
  }
}

export function upsertFormat(
  formats: PrintFormatRecord[],
  nextFormat: PrintFormatRecord
): PrintFormatRecord[] {
  const without = formats.filter((format) => format.id !== nextFormat.id)
  return [...without, nextFormat]
}

export function reassignDocumentFormatIds(
  documents: { invoice: { formatId: string }; deliveryNote: { formatId: string } },
  formats: PrintFormatRecord[]
): { invoice: { formatId: string }; deliveryNote: { formatId: string } } {
  const invoiceFormatId = formats.some((format) => format.id === documents.invoice.formatId)
    ? documents.invoice.formatId
    : BUILTIN_INVOICE_FORMAT_ID
  const deliveryFormatId = formats.some((format) => format.id === documents.deliveryNote.formatId)
    ? documents.deliveryNote.formatId
    : BUILTIN_DELIVERY_NOTE_FORMAT_ID

  return {
    invoice: { formatId: invoiceFormatId },
    deliveryNote: { formatId: deliveryFormatId },
  }
}
