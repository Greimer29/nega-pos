import type { PrintDocumentKind } from './print-config'

/** Ancho útil estándar para tickets térmicos (rollo 80 mm, área imprimible ~78 mm). */
export const DEFAULT_TICKET_PAPER_WIDTH_MM = 78

export function resolvePaperWidthMm(value: number | undefined): number {
  if (!Number.isFinite(value) || value! <= 0) {
    return DEFAULT_TICKET_PAPER_WIDTH_MM
  }
  if (value === 80) {
    return DEFAULT_TICKET_PAPER_WIDTH_MM
  }
  return value!
}

export const BUILTIN_INVOICE_FORMAT_ID = 'builtin-invoice'
export const BUILTIN_DELIVERY_NOTE_FORMAT_ID = 'builtin-delivery-note'
export const BUILTIN_COMANDA_FORMAT_ID = 'builtin-comanda'

export const BUILTIN_FORMAT_IDS: Record<PrintDocumentKind, string> = {
  invoice: BUILTIN_INVOICE_FORMAT_ID,
  deliveryNote: BUILTIN_DELIVERY_NOTE_FORMAT_ID,
  comanda: BUILTIN_COMANDA_FORMAT_ID,
}

export const DEFAULT_INVOICE_BODY_HTML = `{{business.header}}
<div class="divider"></div>
<div class="center bold">FACTURA</div>
<div class="center">{{sale.code}}</div>
<div class="center muted">{{sale.date}}</div>
<div class="divider"></div>
<div>Cliente: {{sale.client}}</div>
{{sale.payment_details}}
<div class="divider"></div>
{{sale.lines}}
<div class="divider"></div>
{{sale.totals_summary}}
{{business.footer}}`

export const DEFAULT_DELIVERY_NOTE_BODY_HTML = `{{business.header}}
<div class="divider"></div>
<div class="center bold">NOTA DE DESPACHO</div>
<div class="center">{{sale.code}}</div>
<div class="center muted">{{sale.date}}</div>
<div class="divider"></div>
<div>Cliente: {{sale.client}}</div>
<div>Estado pedido: {{sale.order_status}}</div>
<div class="divider"></div>
<div class="bold">Productos a despachar</div>
{{sale.delivery_lines}}
<div class="divider"></div>
<div class="signature">Recibido conforme</div>`

export const DEFAULT_COMANDA_BODY_HTML = `<div class="center bold">NEGA POS</div>
<div class="center muted">Correlativo de comanda: {{sale.code}}</div>
<div class="center muted">Fecha: {{sale.date}}</div>
<div class="center muted">------------------------------</div>
{{comanda.lines}}`

export function migrateBuiltinBodyHtml(
  id: string,
  bodyHtml: string,
  defaultBodyHtml: string
): string {
  if (id !== BUILTIN_INVOICE_FORMAT_ID) {
    return bodyHtml
  }

  if (
    bodyHtml.includes('{{sale.payment_type}}') &&
    !bodyHtml.includes('{{sale.payment_details}}')
  ) {
    return defaultBodyHtml
  }

  if (bodyHtml.includes('TOTAL USD') && !bodyHtml.includes('{{sale.totals_summary}}')) {
    return defaultBodyHtml
  }

  return bodyHtml
}

export function createBuiltinFormats(): Array<{
  id: string
  name: string
  documentKind: PrintDocumentKind
  paperWidthMm: number
  bodyHtml: string
  isBuiltin: boolean
}> {
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

export function normalizeFormats(
  input:
    | Array<{
        id: string
        name: string
        documentKind: PrintDocumentKind
        paperWidthMm: number
        bodyHtml: string
        isBuiltin: boolean
      }>
    | undefined
) {
  const builtins = createBuiltinFormats()
  const byId = new Map(builtins.map((format) => [format.id, { ...format }]))

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
