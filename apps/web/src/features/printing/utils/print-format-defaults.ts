import type { PrintDocumentKind } from '@/features/printing/types'

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

const INVOICE_STYLES = `<style>
.ticket-root { font-family: 'Courier New', Courier, monospace; font-size: 11px; line-height: 1.2; color: #000; padding: 2px 3px; max-width: 100%; overflow-wrap: anywhere; word-break: break-word; }
.inv-repeat { font-size: 8px; text-align: center; margin-bottom: 3px; }
.inv-center { text-align: center; }
.inv-field { margin: 1px 0; }
.inv-rif { font-weight: 700; margin-bottom: 2px; }
.inv-legal { font-weight: 700; }
.inv-address { margin-bottom: 3px; }
.ph-logo img { max-width: 64px; max-height: 64px; object-fit: contain; }
.inv-recibo-title { font-weight: 700; margin: 8px 0 4px; }
.inv-sep { text-align: center; margin: 4px 0; letter-spacing: -1px; }
.inv-line { margin: 3px 0 5px; }
.inv-line-name { text-align: left; margin-bottom: 1px; }
.inv-line-detail { display: flex; justify-content: space-between; gap: 4px; align-items: flex-start; }
.inv-line-detail-left { flex: 1 1 auto; min-width: 0; text-align: left; }
.inv-line-detail-right { flex: 0 1 auto; text-align: right; max-width: 48%; }
.inv-totals { width: 100%; margin-top: 2px; }
.inv-total-line { display: flex; justify-content: space-between; gap: 4px; align-items: flex-start; margin: 2px 0; }
.inv-total-label { flex: 1 1 auto; min-width: 0; text-transform: uppercase; }
.inv-total-value { flex: 0 1 auto; text-align: right; max-width: 52%; }
.inv-empty { text-align: center; }
</style>`

export const DEFAULT_INVOICE_BODY_HTML = `${INVOICE_STYLES}
<div class="ticket-root">
<div class="inv-repeat">{{business.header_repeat}}</div>
<div class="inv-center inv-rif">{{business.rif}}</div>
<div class="inv-center inv-legal">{{business.legal_name}}</div>
<div class="inv-center inv-address">{{business.address}}</div>
<div class="inv-center ph-logo">{{business.logo}}</div>
<div class="inv-field">RIF/C.I.: {{sale.client_document}}</div>
<div class="inv-field">RAZON SOCIAL: {{sale.client}}</div>
<div class="inv-field">ESTA: {{ticket.station}}</div>
<div class="inv-field">USUA: {{sale.user_code}}</div>
<div class="inv-field">MESERO: {{sale.seller}}</div>
<div class="inv-field">REF: {{sale.code}}</div>
<div class="inv-center inv-recibo-title">RECIBO</div>
<div class="inv-field">RECIBO: {{sale.code}}</div>
<div class="inv-field">FECHA: {{sale.date_only}} {{sale.time_only}}</div>
<div class="inv-sep">--------------------</div>
{{sale.lines}}
<div class="inv-sep">--------------------</div>
{{sale.totals_summary}}
</div>`

const DELIVERY_NOTE_STYLES = `<style>
.ticket-root { font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.4; color: #000; padding: 8px; }
.dn-center { text-align: center; }
.dn-bold { font-weight: 700; }
.dn-muted { color: #444; }
.dn-divider { border-top: 1px dashed #999; margin: 8px 0; }
.dn-title { margin: 4px 0; }
.dn-line { margin: 8px 0; padding-bottom: 6px; border-bottom: 1px dashed #ccc; }
.dn-line:last-child { border-bottom: none; }
.dn-code { text-align: center; }
.dn-name { word-break: break-word; }
.dn-desc { word-break: break-word; }
.dn-qty { text-align: center; margin-top: 2px; }
.dn-empty { text-align: center; color: #444; }
.dn-signature { margin-top: 24px; border-top: 1px solid #333; padding-top: 4px; text-align: center; font-size: 10px; }
.ph-hdr { text-align: center; }
.ph-hdr-title { font-weight: 700; margin-bottom: 4px; }
.ph-hdr-subtitle { color: #444; }
</style>`

export const DEFAULT_DELIVERY_NOTE_BODY_HTML = `${DELIVERY_NOTE_STYLES}
<div class="ticket-root">
<div class="dn-center">{{business.header}}</div>
<div class="dn-divider"></div>
<div class="dn-center dn-bold dn-title">NOTA DE DESPACHO</div>
<div class="dn-center">{{sale.code}}</div>
<div class="dn-center dn-muted">{{sale.date}}</div>
<div class="dn-divider"></div>
<div>Cliente: {{sale.client}}</div>
<div>Estado pedido: {{sale.order_status}}</div>
<div class="dn-divider"></div>
<div class="dn-bold">Productos a despachar</div>
{{sale.delivery_lines}}
<div class="dn-divider"></div>
<div class="dn-signature">Recibido conforme</div>
</div>`

const COMANDA_STYLES = `<style>
.ticket-root { font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.35; color: #000; padding: 4px; font-weight: 700; max-width: 100%; overflow-wrap: anywhere; word-break: break-word; }
.cmd-center { text-align: center; }
.cmd-sep { text-align: center; margin: 4px 0; }
.cmd-item { margin: 6px 0; }
.cmd-code, .cmd-name, .cmd-qty, .cmd-note, .cmd-formula-line { margin: 2px 0; }
.cmd-note { padding-left: 8px; font-weight: 400; }
.cmd-empty { text-align: center; }
</style>`

export const DEFAULT_COMANDA_BODY_HTML = `${COMANDA_STYLES}
<div class="ticket-root">
<div class="cmd-center">NEGA POS</div>
<div class="cmd-center">Correlativo de comanda: {{sale.code}}</div>
<div class="cmd-center">Fecha: {{sale.date}}</div>
<div class="cmd-sep">--------------------</div>
{{comanda.lines}}
</div>`

export const FORMAT_PLACEHOLDER_HELP = [
  '{{business.header}} — nombre y subtítulo del negocio',
  '{{business.header_repeat}} — repetición pequeña de razón social + RIF (encabezado)',
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
  '{{business.footer}} — pie de ticket (texto)',
  '{{ticket.station}} — estación/caja (print-config)',
  '{{sale.code}} — número de factura',
  '{{sale.date}} — fecha y hora de la venta',
  '{{sale.date_only}} — solo fecha',
  '{{sale.time_only}} — solo hora',
  '{{sale.client}} — nombre del cliente',
  '{{sale.client_document}} — RIF/CI del cliente',
  '{{sale.seller}} — código mesero (T01, T02…)',
  '{{sale.seller_name}} — nombre del vendedor',
  '{{sale.user_code}} — código usuario (C01, C02…)',
  '{{sale.payment_type}} — contado o crédito',
  '{{sale.payment_method}} — nombre del método de pago',
  '{{sale.payment_details}} — método de pago, tasa y total en moneda local',
  '{{sale.order_status}} — estado del pedido',
  '{{sale.lines}} — detalle de productos (factura)',
  '{{sale.delivery_lines}} — detalle de productos (nota de despacho)',
  '{{sale.total}} — total en USD',
  '{{sale.amount_paid}} — monto pagado en USD',
  '{{sale.balance}} — saldo pendiente en USD',
  '{{sale.totals_summary}} — total, pago y pago por método (factura)',
  '{{area.label}} — área/categoría (comanda parcial)',
  '{{comanda.lines}} — producto, cantidad y medida (comanda)',
  '',
  'Clases de placeholders (definir estilos en el bloque <style> del formato):',
  'inv-line, inv-line-name, inv-line-detail, inv-line-detail-left, inv-line-detail-right',
  'inv-totals, inv-total-line, inv-total-label, inv-total-value',
  'dn-line, dn-code, dn-name, dn-qty',
  'cmd-item, cmd-code, cmd-name, cmd-qty, cmd-note, cmd-formula-line',
].join('\n')
