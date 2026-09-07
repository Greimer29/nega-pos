import type { Sale } from '@/features/ventas/types'
import type { PrintBusinessConfig } from '@/features/printing/types'
import {
  escapeHtml,
  formatMoneyUsd,
  formatSaleDate,
  paymentTypeLabel,
  renderBusinessHeader,
  renderSaleLines,
  saleClientLabel,
} from '@/features/printing/templates/format-utils'

export function renderInvoiceBody(sale: Sale, business: PrintBusinessConfig): string {
  const footer = business.footer.trim()
    ? `<div class="divider"></div><div class="center muted">${escapeHtml(business.footer)}</div>`
    : ''

  return `
    ${renderBusinessHeader(business)}
    <div class="divider"></div>
    <div class="center bold">FACTURA</div>
    <div class="center">${escapeHtml(sale.code ?? `#${sale.id}`)}</div>
    <div class="center muted">${escapeHtml(formatSaleDate(sale.confirmed_at ?? sale.sold_at))}</div>
    <div class="divider"></div>
    <div>Cliente: ${escapeHtml(saleClientLabel(sale))}</div>
    <div>Pago: ${escapeHtml(paymentTypeLabel(sale.payment_type))}</div>
    <div class="divider"></div>
    ${renderSaleLines(sale)}
    <div class="divider"></div>
    ${
      Number(sale.discount_usd ?? 0) > 0.0001
        ? `<div class="line-row">
      <span>DESCUENTO</span>
      <span>-${formatMoneyUsd(sale.discount_usd ?? '0')}</span>
    </div>`
        : ''
    }
    <div class="line-row bold">
      <span>TOTAL USD</span>
      <span>${formatMoneyUsd(sale.total_usd)}</span>
    </div>
    ${footer}
  `
}
