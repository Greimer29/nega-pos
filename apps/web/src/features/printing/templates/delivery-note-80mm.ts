import type { Sale, SaleLine } from '@/features/ventas/types'
import type { PrintBusinessConfig } from '@/features/printing/types'
import {
  escapeHtml,
  formatSaleDate,
  renderBusinessHeader,
  renderSaleLines,
  saleClientLabel,
} from '@/features/printing/templates/format-utils'

export type RenderDeliveryNoteOptions = {
  lines?: SaleLine[]
  categoryLabel?: string
}

export function renderDeliveryNoteBody(
  sale: Sale,
  business: PrintBusinessConfig,
  options?: RenderDeliveryNoteOptions
): string {
  const lines = options?.lines
  const categoryLabel = options?.categoryLabel?.trim()
  const areaLine = categoryLabel
    ? `<div class="center muted">Área: ${escapeHtml(categoryLabel)}</div>`
    : ''

  return `
    ${renderBusinessHeader(business)}
    <div class="divider"></div>
    <div class="center bold">NOTA DE DESPACHO</div>
    <div class="center">${escapeHtml(sale.code ?? `#${sale.id}`)}</div>
    <div class="center muted">${escapeHtml(formatSaleDate(sale.confirmed_at ?? sale.sold_at))}</div>
    ${areaLine}
    <div class="divider"></div>
    <div>Cliente: ${escapeHtml(saleClientLabel(sale))}</div>
    <div>Estado pedido: ${escapeHtml(sale.order_status)}</div>
    <div class="divider"></div>
    <div class="bold">Productos a despachar</div>
    ${renderSaleLines(sale, lines)}
    <div class="divider"></div>
    <div class="signature">Recibido conforme</div>
  `
}
