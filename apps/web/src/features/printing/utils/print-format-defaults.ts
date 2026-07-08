import type { PrintDocumentKind } from '@/features/printing/types'

/** Ancho útil estándar para tickets térmicos (rollo 80 mm, área imprimible ~78 mm). */
export const DEFAULT_TICKET_PAPER_WIDTH_MM = 78

export function resolvePaperWidthMm(value: number | undefined): number {
  if (!Number.isFinite(value) || value! <= 0) {
    return DEFAULT_TICKET_PAPER_WIDTH_MM
  }
  // Migración: el default histórico era 80 mm (rollo físico); el área útil es 78 mm.
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
<div>Pago: {{sale.payment_type}}</div>
<div class="divider"></div>
{{sale.lines}}
<div class="divider"></div>
<div class="line-row bold">
  <span>TOTAL USD</span>
  <span>{{sale.total}}</span>
</div>
{{business.footer}}`

export const DEFAULT_DELIVERY_NOTE_BODY_HTML = `{{business.header}}
<div class="divider"></div>
<div class="center bold">NOTA DE DESPACHO</div>
<div class="center">{{sale.code}}</div>
<div class="center muted">{{sale.date}}</div>
{{area.label}}
<div class="divider"></div>
<div>Cliente: {{sale.client}}</div>
<div>Estado pedido: {{sale.order_status}}</div>
<div class="divider"></div>
<div class="bold">Productos a despachar</div>
{{sale.delivery_lines}}
<div class="divider"></div>
<div class="signature">Recibido conforme</div>`

export const DEFAULT_COMANDA_BODY_HTML = `
<div class="center bold">NEGA POS</div>
<div class="center muted">Correlativo de comanda: {{sale.code}}</div>
<div class="center muted">Fecha: {{sale.date}}</div>
<div class="center muted">------------------------------</div>
{{comanda.lines}}
`

export const FORMAT_PLACEHOLDER_HELP = [
  '{{business.header}} — nombre y subtítulo del negocio',
  '{{business.logo}} — logo (si está configurado)',
  '{{business.fiscal}} — razón social, RIF, dirección y contacto',
  '{{business.name}} — nombre comercial',
  '{{business.subtitle}} — subtítulo / eslogan',
  '{{business.legal_name}} — razón social',
  '{{business.rif}} — RIF',
  '{{business.address}} — dirección',
  '{{business.phone}} — teléfono',
  '{{business.email}} — correo',
  '{{business.website}} — sitio web',
  '{{business.footer}} — pie de ticket (si está configurado)',
  '{{sale.code}} — número de factura',
  '{{sale.date}} — fecha de la venta',
  '{{sale.client}} — nombre del cliente',
  '{{sale.payment_type}} — contado o crédito',
  '{{sale.order_status}} — estado del pedido',
  '{{sale.lines}} — detalle de productos (factura / nota)',
  '{{sale.delivery_lines}} — detalle de productos (nota de despacho, sin precios)',
  '{{sale.total}} — total en USD',
  '{{area.label}} — área/categoría (comanda parcial)',
  '{{comanda.lines}} — producto, cantidad y medida (comanda)',
].join('\n')
