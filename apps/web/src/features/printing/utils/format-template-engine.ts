import type { Sale, SaleLine } from '@/features/ventas/types'
import type { PrintBusinessConfig, PrintFormatRecord } from '@/features/printing/types'
import { paymentMethodLabel } from '@/features/ventas/constants'
import {
  escapeHtml,
  formatMoneyUsd,
  formatSaleDate,
  paymentTypeLabel,
  renderBusinessFiscal,
  renderBusinessHeader,
  renderBusinessLogo,
  renderComandaLines,
  renderDeliveryNoteLines,
  renderSaleLines,
  renderSalePaymentDetails,
  renderSaleTotalsSummary,
  saleClientLabel,
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

  return `<div class="divider"></div><div class="center muted">${escapeHtml(footer)}</div>`
}

function renderAreaLabel(categoryLabel?: string): string {
  const label = categoryLabel?.trim()
  if (!label) {
    return ''
  }

  return `<div class="center muted">Área: ${escapeHtml(label)}</div>`
}

function buildPlaceholderMap(
  sale: Sale,
  business: PrintBusinessConfig,
  comandaOptions?: RenderComandaOptions
): Record<string, string> {
  const lines = comandaOptions?.lines

  return {
    'business.header': renderBusinessHeader(business),
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
    'sale.code': escapeHtml(sale.code ?? `#${sale.id}`),
    'sale.date': escapeHtml(formatSaleDate(sale.confirmed_at ?? sale.sold_at)),
    'sale.client': escapeHtml(saleClientLabel(sale)),
    'sale.payment_type': escapeHtml(paymentTypeLabel(sale.payment_type)),
    'sale.payment_method': escapeHtml(paymentMethodLabel(sale.payment_method)),
    'sale.payment_details': renderSalePaymentDetails(sale),
    'sale.order_status': escapeHtml(sale.order_status),
    'sale.lines': renderSaleLines(sale, lines),
    'sale.delivery_lines': renderDeliveryNoteLines(sale, lines),
    'sale.total': formatMoneyUsd(sale.total_usd),
    'sale.amount_paid': formatMoneyUsd(sale.amount_paid_usd),
    'sale.totals_summary': renderSaleTotalsSummary(sale),
    'area.label': renderAreaLabel(comandaOptions?.categoryLabel),
    'comanda.lines': renderComandaLines(lines ?? sale.lines ?? [], {
      printFormula: comandaOptions?.printFormula ?? false,
    }),
  }
}

export function renderFormatBody(
  format: PrintFormatRecord,
  sale: Sale,
  business: PrintBusinessConfig,
  comandaOptions?: RenderComandaOptions
): string {
  const placeholders = buildPlaceholderMap(sale, business, comandaOptions)

  return format.bodyHtml.replace(/\{\{\s*([a-z_.]+)\s*\}\}/gi, (_match, key: string) => {
    return placeholders[key] ?? ''
  })
}
