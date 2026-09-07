import type { Sale, SaleLine } from '@/features/ventas/types'
import type { PrintBusinessConfig, PrintTicketConfig } from '@/features/printing/types'
import { paymentMethodLabel } from '@/features/ventas/constants'
import {
  escapeHtml,
  formatMoneyUsd,
  formatNativeMoney,
  formatSaleDate,
  formatSaleDateOnly,
  formatSaleTimeOnly,
  paymentTypeLabel,
  renderBusinessFiscal,
  renderBusinessHeader,
  renderBusinessHeaderRepeat,
  renderBusinessLogo,
  renderComandaLines,
  renderDeliveryNoteLines,
  renderSaleLines,
  renderSalePaymentDetails,
  renderSaleTotalsSummary,
  saleClientDocument,
  saleClientLabel,
  saleSellerCode,
  saleSellerLabel,
  saleUserCode,
} from '@/features/printing/templates/format-utils'

export type RenderComandaOptions = {
  lines?: SaleLine[]
  categoryLabel?: string
  printFormula?: boolean
}

function renderBusinessFooter(business: PrintBusinessConfig): string {
  const footer = business.footer.trim()
  if (!footer) {
    return ''
  }

  return escapeHtml(footer)
}

function renderAreaLabel(categoryLabel?: string): string {
  const label = categoryLabel?.trim()
  if (!label) {
    return ''
  }

  return `<div class="cmd-muted cmd-center">Área: ${escapeHtml(label)}</div>`
}

function buildPlaceholderMap(
  sale: Sale,
  business: PrintBusinessConfig,
  ticket: PrintTicketConfig,
  comandaOptions?: RenderComandaOptions
): Record<string, string> {
  const lines = comandaOptions?.lines
  const saleDate = sale.confirmed_at ?? sale.sold_at

  return {
    'business.header': renderBusinessHeader(business),
    'business.header_repeat': renderBusinessHeaderRepeat(business),
    'business.footer': renderBusinessFooter(business),
    'business.logo': renderBusinessLogo(business),
    'business.fiscal': renderBusinessFiscal(business),
    'business.name': escapeHtml(business.name),
    'business.subtitle': escapeHtml(business.subtitle),
    'business.legal_name': escapeHtml(business.legalName ?? ''),
    'business.rif': escapeHtml(business.rif ?? ''),
    'business.address': escapeHtml(business.address ?? ''),
    'business.phone': escapeHtml(business.phone ?? ''),
    'business.email': escapeHtml(business.email ?? ''),
    'business.website': escapeHtml(business.website ?? ''),
    'ticket.station': escapeHtml(ticket.station_label?.trim() || '—'),
    'sale.code': escapeHtml(sale.code ?? `#${sale.id}`),
    'sale.date': escapeHtml(formatSaleDate(saleDate)),
    'sale.date_only': escapeHtml(formatSaleDateOnly(saleDate)),
    'sale.time_only': escapeHtml(formatSaleTimeOnly(saleDate)),
    'sale.client': escapeHtml(saleClientLabel(sale)),
    'sale.client_document': escapeHtml(saleClientDocument(sale)),
    'sale.seller': escapeHtml(saleSellerCode(sale)),
    'sale.seller_name': escapeHtml(saleSellerLabel(sale)),
    'sale.user_code': escapeHtml(saleUserCode(sale)),
    'sale.payment_type': escapeHtml(paymentTypeLabel(sale.payment_type)),
    'sale.payment_method': escapeHtml(paymentMethodLabel(sale.payment_method)),
    'sale.payment_details': renderSalePaymentDetails(sale),
    'sale.order_status': escapeHtml(sale.order_status),
    'sale.lines': renderSaleLines(sale, lines),
    'sale.delivery_lines': renderDeliveryNoteLines(sale, lines),
    'sale.total': formatMoneyUsd(sale.total_usd),
    'sale.discount': formatMoneyUsd(sale.discount_usd ?? '0'),
    'sale.amount_paid': formatMoneyUsd(sale.amount_paid_usd),
    'sale.balance': formatMoneyUsd(sale.balance_usd),
    'sale.total_native': formatNativeMoney(sale, sale.total_usd),
    'sale.amount_paid_native': formatNativeMoney(sale, sale.amount_paid_usd),
    'sale.totals_summary': renderSaleTotalsSummary(sale),
    'area.label': renderAreaLabel(comandaOptions?.categoryLabel),
    'comanda.lines': renderComandaLines(lines ?? sale.lines ?? [], {
      printFormula: comandaOptions?.printFormula ?? false,
    }),
  }
}

export function renderFormatBody(
  format: { bodyHtml: string },
  sale: Sale,
  business: PrintBusinessConfig,
  ticket: PrintTicketConfig = { station_label: '' },
  comandaOptions?: RenderComandaOptions
): string {
  const placeholders = buildPlaceholderMap(sale, business, ticket, comandaOptions)

  return format.bodyHtml.replace(/\{\{\s*([a-z_.]+)\s*\}\}/gi, (_match, key: string) => {
    return placeholders[key] ?? ''
  })
}
