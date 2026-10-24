import { type DateTime } from 'luxon'
import { APP_TIMEZONE } from '#utils/app_timezone'

export type SaleQuoteLineInput = {
  description: string
  size: string | null
  unit: string | null
  quantity: number
  unitPriceBase: number
  subtotalBase: number
  isWholesale: boolean
  unitsPerPack: number | null
}

export type SaleQuoteInput = {
  saleId: number
  customerName: string
  customerDocument: string | null
  customerPhone: string | null
  lines: SaleQuoteLineInput[]
  discountBase: number
  totalBase: number | null
  baseCurrencyCode: string
  currencyCode: string
  /** Units of `currencyCode` per unit of base currency (1 for the base itself). */
  rate: number
  validityDays: number
  issuedAt: DateTime
}

export type SaleQuoteLine = {
  description: string
  quantity: string
  unitPrice: string
  subtotal: string
}

export type SaleQuoteDocument = {
  number: string
  issuedOn: string
  validUntil: string | null
  customerName: string
  customerDocument: string | null
  customerPhone: string | null
  currencyCode: string
  lines: SaleQuoteLine[]
  subtotal: string
  discount: string | null
  total: string
  /** e.g. `1 Au = 117,00 $`; null when the quote is in the base currency. */
  rateLabel: string | null
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  VES: 'Bs',
  XAU: 'Au',
}

export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code.toUpperCase()] ?? code.toUpperCase()
}

/** Same format as the web: `es-VE`, 2 to 4 decimals, symbol first. */
export function formatQuoteMoney(value: number, currencyCode: string): string {
  const amount = Number.isFinite(value) ? value : 0
  return `${currencySymbol(currencyCode)} ${amount.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })}`
}

function formatQuantity(value: number): string {
  return value.toLocaleString('es-VE', { maximumFractionDigits: 3 })
}

function lineDescription(line: SaleQuoteLineInput): string {
  const parts = [line.description.trim() || 'Producto']
  if (line.size?.trim()) {
    parts.push(`Talla ${line.size.trim()}`)
  }
  return parts.join(' - ')
}

function lineQuantity(line: SaleQuoteLineInput): string {
  const quantity = formatQuantity(line.quantity)
  if (line.isWholesale) {
    const pack = line.unitsPerPack ? ` x${formatQuantity(line.unitsPerPack)}` : ''
    return `${quantity} paq.${pack}`
  }
  const unit = line.unit?.trim().toLowerCase()
  return unit ? `${quantity} ${unit}` : quantity
}

/** Builds the printable quote of a draft sale with amounts converted to `currencyCode`. */
export function buildSaleQuoteDocument(input: SaleQuoteInput): SaleQuoteDocument {
  const toDisplay = (amountBase: number) => amountBase * input.rate
  const money = (amountBase: number) => formatQuoteMoney(toDisplay(amountBase), input.currencyCode)

  const subtotalBase = input.lines.reduce((sum, line) => sum + line.subtotalBase, 0)
  const discountBase = Math.max(0, input.discountBase)
  const totalBase = input.totalBase ?? Math.max(0, subtotalBase - discountBase)

  const issued = input.issuedAt.setZone(APP_TIMEZONE)
  const isBase = input.currencyCode.toUpperCase() === input.baseCurrencyCode.toUpperCase()

  return {
    number: String(input.saleId),
    issuedOn: issued.toFormat('dd/MM/yyyy'),
    validUntil:
      input.validityDays > 0
        ? issued.plus({ days: input.validityDays }).toFormat('dd/MM/yyyy')
        : null,
    customerName: input.customerName.trim() || 'Cliente',
    customerDocument: input.customerDocument?.trim() || null,
    customerPhone: input.customerPhone?.trim() || null,
    currencyCode: input.currencyCode.toUpperCase(),
    lines: input.lines.map((line) => ({
      description: lineDescription(line),
      quantity: lineQuantity(line),
      unitPrice: money(line.unitPriceBase),
      subtotal: money(line.subtotalBase),
    })),
    subtotal: money(subtotalBase),
    discount: discountBase > 0.00005 ? money(discountBase) : null,
    total: money(totalBase),
    rateLabel: isBase
      ? null
      : `1 ${currencySymbol(input.baseCurrencyCode)} = ${formatQuoteMoney(input.rate, input.currencyCode)}`,
  }
}
