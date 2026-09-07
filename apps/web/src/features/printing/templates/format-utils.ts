import type { Sale, SaleLine } from '@/features/ventas/types'
import type { PrintBusinessConfig } from '@/features/printing/types'
import { paymentMethodLabel } from '@/features/ventas/constants'
import { formatNativeAmountNumber, nativeCurrencyDecimals } from '@/features/currencies/utils/currency-decimals'
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

function formatMoneyNative(value: number, currencyCode: string): string {
  return formatNativeAmountNumber(value, currencyCode)
}

export function resolveSaleCurrencyCode(sale: Sale): string {
  return sale.payment_method?.currency_code?.trim() || 'USD'
}

export function toNativeAmount(sale: Sale, baseAmount: number): number {
  const totalBase = Number(sale.total_usd)
  if (Math.abs(baseAmount - totalBase) < 0.00005 && sale.total_bs != null && sale.total_bs !== '') {
    const snapshotted = Number(sale.total_bs)
    if (Number.isFinite(snapshotted)) {
      return snapshotted
    }
  }

  const rate = Number(sale.usd_rate)
  if (!Number.isFinite(rate) || rate <= 0) return baseAmount
  return baseAmount * rate
}

export function formatNativeMoney(sale: Sale, usdAmount: string | number): string {
  return formatMoneyNative(toNativeAmount(sale, Number(usdAmount)), resolveSaleCurrencyCode(sale))
}

export function formatSaleDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('es-VE', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function formatSaleDateOnly(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export function formatSaleTimeOnly(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleTimeString('es-VE', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

export function saleClientLabel(sale: Sale): string {
  return sale.customer?.name ?? sale.guest_name ?? 'Cliente ocasional'
}

export function saleClientDocument(sale: Sale): string {
  const document = sale.customer?.document?.trim()
  return document || '—'
}

export function saleSellerLabel(sale: Sale): string {
  return sale.sold_by?.name?.trim() || '—'
}

export function saleUserCode(sale: Sale): string {
  const id = sale.sold_by?.id
  if (!id) return '—'
  return `C${String(id).padStart(2, '0')}`
}

export function saleSellerCode(sale: Sale): string {
  const id = sale.sold_by?.id
  if (!id) return '—'
  return `T${String(id).padStart(2, '0')}`
}

export function renderBusinessHeaderRepeat(business: PrintBusinessConfig): string {
  const legal = business.legalName?.trim() || business.name.trim()
  const rif = business.rif?.trim()
  if (!legal && !rif) {
    return ''
  }

  return escapeHtml([legal, rif].filter(Boolean).join(' '))
}

function formatReceiptLineQuantity(qty: number, measure?: string): string {
  const decimals = measure ? inventoryQuantityDecimals(measure) : 0
  if (decimals === 0) {
    return String(Math.round(qty))
  }

  return qty.toLocaleString('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function formatReceiptAmountLabel(sale: Sale, usdAmount: string | number): string {
  const currency = resolveSaleCurrencyCode(sale)
  const amount = formatNativeMoney(sale, usdAmount)
  return `${currency} ${amount}`
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
    ? `<div class="ph-hdr-subtitle">${escapeHtml(business.subtitle)}</div>`
    : ''

  return `
    <div class="ph-hdr">
      ${name ? `<div class="ph-hdr-title">${escapeHtml(name)}</div>` : ''}
      ${subtitle}
    </div>
  `
}

export function renderBusinessLogo(business: PrintBusinessConfig): string {
  if (!business.hasLogo || !business.logoUrl?.trim()) {
    return ''
  }

  return `<img src="${escapeHtml(business.logoUrl)}" alt="Logo" />`
}

export function renderBusinessFiscal(business: PrintBusinessConfig): string {
  const lines: string[] = []

  if (business.legalName?.trim()) {
    lines.push(`<div class="ph-fiscal-line">${escapeHtml(business.legalName)}</div>`)
  }
  if (business.rif?.trim()) {
    lines.push(`<div class="ph-fiscal-line ph-fiscal-muted">RIF: ${escapeHtml(business.rif)}</div>`)
  }
  if (business.address?.trim()) {
    lines.push(`<div class="ph-fiscal-line ph-fiscal-muted">${escapeHtml(business.address)}</div>`)
  }
  if (business.phone?.trim()) {
    lines.push(`<div class="ph-fiscal-line ph-fiscal-muted">Tel: ${escapeHtml(business.phone)}</div>`)
  }
  if (business.email?.trim()) {
    lines.push(`<div class="ph-fiscal-line ph-fiscal-muted">${escapeHtml(business.email)}</div>`)
  }
  if (business.website?.trim()) {
    lines.push(`<div class="ph-fiscal-line ph-fiscal-muted">${escapeHtml(business.website)}</div>`)
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

function formatPaymentNativeAmount(value: string | number | null | undefined, currencyCode: string): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) {
    return formatNativeAmountNumber(0, currencyCode)
  }

  return formatNativeAmountNumber(amount, currencyCode)
}

export function renderSalePaymentDetails(sale: Sale): string {
  if (sale.payment_type === 'CREDIT') {
    const lines = ['<div class="ph-payment-line">Forma de pago: Crédito</div>']
    if (sale.credit_due_date) {
      lines.push(`<div class="ph-payment-line">Vence: ${escapeHtml(formatSaleDate(sale.credit_due_date))}</div>`)
    }
    return lines.join('')
  }

  const methodName = paymentMethodLabel(sale.payment_method)
  const lines = [`<div class="ph-payment-line">Método de pago: ${escapeHtml(methodName)}</div>`]

  const rate = sale.usd_rate ? Number(sale.usd_rate) : null
  const totalNative = sale.total_bs ? Number(sale.total_bs) : null
  const currencyCode = sale.payment_method?.currency_code?.trim() ?? 'USD'
  const rateDecimals = nativeCurrencyDecimals(currencyCode)

  if (rate && rate > 0 && currencyCode !== 'USD') {
    lines.push(
      `<div class="ph-payment-line">Tasa: ${escapeHtml(
        rate.toLocaleString('es-VE', {
          minimumFractionDigits: Math.min(2, rateDecimals),
          maximumFractionDigits: rateDecimals,
        })
      )} ${escapeHtml(currencyCode)}</div>`
    )
  }

  if (totalNative !== null && Number.isFinite(totalNative)) {
    lines.push(
      `<div class="ph-payment-line">Total ${escapeHtml(currencyCode)}: ${escapeHtml(
        formatPaymentNativeAmount(totalNative, currencyCode)
      )}</div>`
    )
  }

  return lines.join('')
}

export function renderSaleTotalsSummary(sale: Sale): string {
  const totalLabel = formatReceiptAmountLabel(sale, sale.total_usd)
  const paidLabel = formatReceiptAmountLabel(sale, sale.amount_paid_usd)
  const balanceLabel = formatReceiptAmountLabel(sale, sale.balance_usd)
  const methodName = paymentMethodLabel(sale.payment_method)
  const discountUsd = Number(sale.discount_usd ?? 0)
  const discountLabel = formatReceiptAmountLabel(sale, sale.discount_usd ?? '0')

  const paymentRowValue = sale.payment_type === 'CREDIT' ? balanceLabel : paidLabel

  return `
    <div class="inv-totals">
      ${
        discountUsd > 0.0001
          ? `<div class="inv-total-line">
          <span class="inv-total-label">DESCUENTO</span>
          <span class="inv-total-value">-${escapeHtml(discountLabel)}</span>
        </div>`
          : ''
      }
      <div class="inv-total-line">
        <span class="inv-total-label">TOTAL</span>
        <span class="inv-total-value">${escapeHtml(totalLabel)}</span>
      </div>
      <div class="inv-total-line">
        <span class="inv-total-label">PAGO</span>
        <span class="inv-total-value">${escapeHtml(paymentRowValue)}</span>
      </div>
      ${
        sale.payment_type === 'CREDIT'
          ? `<div class="inv-total-line">
          <span class="inv-total-label">CRÉDITO</span>
          <span class="inv-total-value">${escapeHtml(balanceLabel)}</span>
        </div>`
          : `<div class="inv-total-line">
          <span class="inv-total-label">PAGO ${escapeHtml(methodName.toUpperCase())}</span>
          <span class="inv-total-value">${escapeHtml(paidLabel)}</span>
        </div>`
      }
    </div>
  `
}

export function renderSaleLines(sale: Sale, linesOverride?: Sale['lines']): string {
  const lines = linesOverride ?? sale.lines ?? []
  if (lines.length === 0) {
    return '<div class="inv-empty">Sin líneas</div>'
  }

  return lines
    .map((line) => {
      const name = line.catalog_product?.name ?? line.material?.name ?? line.description
      const qty = Number(line.quantity)
      const unitPriceNative = formatNativeMoney(sale, line.unit_price_usd)
      const subtotalLabel = formatReceiptAmountLabel(sale, line.subtotal_usd)
      const measure = resolveLineMeasure(line)
      const qtyLabel = formatReceiptLineQuantity(qty, measure)

      const detailLeft = `${qtyLabel} x ${unitPriceNative} ${measure}`

      return `
        <div class="inv-line">
          <div class="inv-line-name">${escapeHtml(name)}</div>
          <div class="inv-line-detail">
            <span class="inv-line-detail-left">${escapeHtml(detailLeft)}</span>
            <span class="inv-line-detail-right">${escapeHtml(subtotalLabel)}</span>
          </div>
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

type ComandaFormulaRow = {
  material?: {
    id: number
    code: string
    name: string
    unit?: string | null
  }
  quantityPerUnit: number
}

function resolveComandaFormulaRows(line: SaleLine): ComandaFormulaRow[] {
  if (line.effective_formula_materials?.length) {
    return line.effective_formula_materials.map((item) => ({
      material: item.material,
      quantityPerUnit: Number(item.quantity_per_unit),
    }))
  }

  if (line.formula_materials?.length) {
    return line.formula_materials.map((item) => ({
      material: item.material,
      quantityPerUnit: Number(item.quantity_per_unit),
    }))
  }

  return (line.catalog_product?.formula?.materials ?? []).map((item) => ({
    material: item.material,
    quantityPerUnit: Number(item.quantity),
  }))
}

export function renderComandaLines(
  lines: SaleLine[],
  options?: { printFormula?: boolean }
): string {
  if (lines.length === 0) {
    return '<div class="cmd-empty">Sin productos</div>'
  }

  return lines
    .map((line) => {
      const qty = Number(line.quantity)
      const measure = resolveLineMeasure(line)
      const productCode = line.catalog_product?.id != null ? String(line.catalog_product.id).padStart(7, '0') : ''
      const formattedQty = formatComandaQuantity(qty, measure)

      const hasPrintFormula = options?.printFormula === true
      const formulaMaterials = hasPrintFormula ? resolveComandaFormulaRows(line) : []

      const formulaBlock =
        hasPrintFormula && formulaMaterials.length > 0
          ? formulaMaterials
              .slice()
              .sort((a, b) =>
                (a.material?.name ?? '').localeCompare(b.material?.name ?? '', 'es')
              )
              .map((item) => {
                const materialName = item.material?.name ?? ''
                const materialUnit = item.material?.unit ?? measure
                const materialQty = item.quantityPerUnit * qty
                const materialQtyText = formatComandaQuantity(materialQty, materialUnit)

                return `<div class="cmd-formula-line">- ${escapeHtml(materialName)} ${escapeHtml(materialQtyText)}</div>`
              })
              .join('')
          : hasPrintFormula
            ? `<div class="cmd-formula-line">- Producto sin formula</div>`
            : ''

      const name = line.catalog_product?.name ?? line.material?.name ?? line.description
      const kitchenNoteBlock = (line.kitchen_note ?? '')
        .split(/\r?\n/)
        .map((row) => row.trim())
        .filter((row) => row.length > 0)
        .map((row) => `<div class="cmd-note">${escapeHtml(row)}</div>`)
        .join('')

      return `
        <div class="cmd-item">
          ${productCode ? `<div class="cmd-code">${escapeHtml(productCode)}</div>` : ''}
          <div class="cmd-name">${escapeHtml(name)}</div>
          <div class="cmd-qty">${escapeHtml(formattedQty)}</div>
          ${kitchenNoteBlock}
          ${formulaBlock}
        </div>
      `
    })
    .join('')
}

export function renderDeliveryNoteLines(sale: Sale, linesOverride?: Sale['lines']): string {
  const lines = linesOverride ?? sale.lines ?? []
  if (lines.length === 0) {
    return '<div class="dn-empty">Sin líneas</div>'
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
        <div class="dn-line">
          ${code ? `<div class="dn-code">${escapeHtml(code)}</div>` : ''}
          <div class="dn-name dn-bold">${escapeHtml(name)}</div>
          ${description ? `<div class="dn-desc">${escapeHtml(description)}</div>` : ''}
          <div class="dn-qty">${escapeHtml(formattedQty)}</div>
        </div>
      `
    })
    .join('')
}
