import type { Sale, SaleLine } from '@/features/ventas/types'
import type { PrintBusinessConfig } from '@/features/printing/types'
import { paymentMethodLabel } from '@/features/ventas/constants'
import { inventoryQuantityDecimals, inventoryUnitAbrev } from '@/lib/inventory-units'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function formatMoneyUsd(value: string | number): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '0.00'
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatSaleDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('es-VE', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function saleClientLabel(sale: Sale): string {
  return sale.customer?.name ?? sale.guest_name ?? 'Cliente ocasional'
}

export function paymentTypeLabel(paymentType: Sale['payment_type']): string {
  return paymentType === 'CREDIT' ? 'Crédito' : 'Contado'
}

export function renderBusinessHeader(business: PrintBusinessConfig): string {
  const name = business.name.trim()
  if (!name && !business.subtitle.trim()) {
    return ''
  }

  const subtitle = business.subtitle.trim()
    ? `<div class="muted center">${escapeHtml(business.subtitle)}</div>`
    : ''

  return `
    <div class="center">
      ${name ? `<div class="title">${escapeHtml(name)}</div>` : ''}
      ${subtitle}
    </div>
  `
}

export function renderBusinessLogo(business: PrintBusinessConfig): string {
  if (!business.hasLogo || !business.logoUrl?.trim()) {
    return ''
  }

  return `<div class="center"><img src="${escapeHtml(business.logoUrl)}" alt="Logo" style="max-width:100%;max-height:64px;object-fit:contain;" /></div>`
}

export function renderBusinessFiscal(business: PrintBusinessConfig): string {
  const lines: string[] = []

  if (business.legalName?.trim()) {
    lines.push(`<div class="center">${escapeHtml(business.legalName)}</div>`)
  }
  if (business.rif?.trim()) {
    lines.push(`<div class="center muted">RIF: ${escapeHtml(business.rif)}</div>`)
  }
  if (business.address?.trim()) {
    lines.push(`<div class="center muted">${escapeHtml(business.address)}</div>`)
  }
  if (business.phone?.trim()) {
    lines.push(`<div class="center muted">Tel: ${escapeHtml(business.phone)}</div>`)
  }
  if (business.email?.trim()) {
    lines.push(`<div class="center muted">${escapeHtml(business.email)}</div>`)
  }
  if (business.website?.trim()) {
    lines.push(`<div class="center muted">${escapeHtml(business.website)}</div>`)
  }

  if (lines.length === 0) {
    return ''
  }

  return lines.join('')
}

function formatLineQuantity(qty: number, measure?: string): string {
  const decimals = measure ? inventoryQuantityDecimals(measure) : 0
  return qty.toLocaleString('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function formatMoneyBs(value: string | number | null | undefined): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '0,00'
  return amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function renderSalePaymentDetails(sale: Sale): string {
  if (sale.payment_type === 'CREDIT') {
    const lines = ['<div>Forma de pago: Crédito</div>']
    if (sale.credit_due_date) {
      lines.push(`<div>Vence: ${escapeHtml(formatSaleDate(sale.credit_due_date))}</div>`)
    }
    return lines.join('')
  }

  const methodName = paymentMethodLabel(sale.payment_method)
  const lines = [`<div>Método de pago: ${escapeHtml(methodName)}</div>`]

  const rate = sale.usd_rate ? Number(sale.usd_rate) : null
  const totalBs = sale.total_bs ? Number(sale.total_bs) : null
  const currencyCode = sale.payment_method?.currency_code?.trim()

  if (rate && rate > 0) {
    lines.push(`<div>Tasa: ${escapeHtml(formatMoneyBs(rate))} Bs/USD</div>`)
  }

  if (totalBs !== null && Number.isFinite(totalBs) && totalBs > 0) {
    const currencyLabel = currencyCode && currencyCode !== 'USD' ? currencyCode : 'Bs'
    lines.push(`<div>Total ${escapeHtml(currencyLabel)}: ${escapeHtml(formatMoneyBs(totalBs))}</div>`)
  }

  return lines.join('')
}

export function renderSaleTotalsSummary(sale: Sale): string {
  const total = formatMoneyUsd(sale.total_usd)
  const paid = formatMoneyUsd(sale.amount_paid_usd)

  return `
    <table class="invoice-totals-table" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td class="bold">Total:</td>
        <td class="right bold">${escapeHtml(total)} USD</td>
      </tr>
      <tr>
        <td>Pagado:</td>
        <td class="right">${escapeHtml(paid)} USD</td>
      </tr>
    </table>
  `
}

export function renderSaleLines(sale: Sale, linesOverride?: Sale['lines']): string {
  const lines = linesOverride ?? sale.lines ?? []
  if (lines.length === 0) {
    return '<div class="muted center">Sin líneas</div>'
  }

  return lines
    .map((line) => {
      const name = line.catalog_product?.name ?? line.material?.name ?? line.description
      const qty = Number(line.quantity)
      const unitPrice = Number(line.unit_price_usd)
      const subtotal = Number(line.subtotal_usd)
      const measure = resolveLineMeasure(line)
      const qtyLabel = formatLineQuantity(qty, measure)

      return `
        <div class="invoice-line">
          <div class="invoice-line-name bold">${escapeHtml(name)}</div>
          <table class="invoice-line-table" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>${escapeHtml(formatMoneyUsd(unitPrice))} x ${escapeHtml(qtyLabel)}</td>
              <td class="right">${escapeHtml(formatMoneyUsd(subtotal))} USD</td>
            </tr>
          </table>
        </div>
      `
    })
    .join('')
}

export function resolveLineMeasure(line: SaleLine): string {
  if (line.catalog_product?.sale_unit) {
    return inventoryUnitAbrev(line.catalog_product.sale_unit)
  }
  if (line.material?.unit) {
    return inventoryUnitAbrev(line.material.unit)
  }
  return 'UND'
}

function formatComandaQuantity(quantity: number, measure: string): string {
  const decimals = inventoryQuantityDecimals(measure)
  const formatted = quantity.toLocaleString('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `${formatted} ${measure}`
}

export function renderComandaLines(
  lines: SaleLine[],
  options?: { printFormula?: boolean }
): string {
  if (lines.length === 0) {
    return '<div class="muted center">Sin productos</div>'
  }

  return lines
    .map((line) => {
      const qty = Number(line.quantity)
      const measure = resolveLineMeasure(line)
      const productCode = line.catalog_product?.id != null ? String(line.catalog_product.id).padStart(7, '0') : ''
      const formattedQty = formatComandaQuantity(qty, measure)

      const hasPrintFormula = options?.printFormula === true
      const formulaMaterials = hasPrintFormula ? line.catalog_product?.formula?.materials ?? [] : []

      const formulaBlock =
        hasPrintFormula && formulaMaterials.length > 0
          ? formulaMaterials
              .slice()
              .sort((a, b) => (a.material?.name ?? '').localeCompare(b.material?.name ?? '', 'es'))
              .map((item) => {
                const materialName = item.material?.name ?? ''
                const materialUnit = item.material?.unit ?? measure
                // La fórmula define consumo por 1 unidad del producto.
                // Para la comanda mostramos el consumo real según `quantity` de la línea.
                const materialQty = Number(item.quantity) * qty
                const materialQtyText = formatComandaQuantity(materialQty, materialUnit)

                return `<div class="comanda-formula-line muted">- ${escapeHtml(materialName)} ${escapeHtml(materialQtyText)}</div>`
              })
              .join('')
          : hasPrintFormula
            ? `<div class="comanda-formula-line muted">- Producto sin formula</div>`
            : ''

      const name = line.catalog_product?.name ?? line.material?.name ?? line.description

      return `
        <div class="comanda-item">
          ${productCode ? `<div class="comanda-code bold">${escapeHtml(productCode)}</div>` : ''}
          <div class="comanda-name">${escapeHtml(name)}</div>
          <div class="comanda-qty bold">${escapeHtml(formattedQty)}</div>
          ${formulaBlock}
        </div>
      `
    })
    .join('')
}

export function renderDeliveryNoteLines(sale: Sale, linesOverride?: Sale['lines']): string {
  const lines = linesOverride ?? sale.lines ?? []
  if (lines.length === 0) {
    return '<div class="muted center">Sin líneas</div>'
  }

  return lines
    .map((line) => {
      const code =
        line.catalog_product?.id != null ? String(line.catalog_product.id).padStart(7, '0') : ''
      const name = line.catalog_product?.name ?? line.material?.name ?? line.description
      const description = line.description?.trim() ?? ''
      const qty = Number(line.quantity)
      const measure = resolveLineMeasure(line)
      const formattedQty = formatComandaQuantity(qty, measure)

      return `
        <div class="delivery-line">
          ${code ? `<div class="center">${escapeHtml(code)}</div>` : ''}
          <div class="bold">${escapeHtml(name)}</div>
          ${description ? `<div>${escapeHtml(description)}</div>` : ''}
          <div class="center">${escapeHtml(formattedQty)}</div>
        </div>
      `
    })
    .join('')
}
