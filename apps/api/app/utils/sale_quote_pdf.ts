import PDFDocument from 'pdfkit'
import type { SaleQuoteDocument } from '#utils/sale_quote_document'

export type SaleQuoteBusiness = {
  tradeName: string
  legalName: string
  rif: string
  address: string
  phone: string
  email: string
  website: string
  terms: string
  accentColor: string
  /** PNG or JPEG bytes; other formats are not supported by pdfkit and are skipped. */
  logo: Buffer | null
}

const MARGIN = 40
const MUTED = '#555555'
const BORDER = '#d4d4d4'
const COLUMNS = [
  { key: 'description', label: 'Descripción', width: 262, align: 'left' },
  { key: 'quantity', label: 'Cant.', width: 70, align: 'right' },
  { key: 'unitPrice', label: 'Precio unit.', width: 100, align: 'right' },
  { key: 'subtotal', label: 'Subtotal', width: 100, align: 'right' },
] as const

/** Characters above Latin-1 that the WinAnsi encoding of the standard PDF fonts still includes. */
const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ')

/**
 * The built-in Helvetica only encodes WinAnsi: anything else (emoji, CJK…) prints as garbage,
 * so it is dropped before drawing.
 */
export function toPdfText(value: string): string {
  let result = ''
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0
    const supported =
      char === '\n' ||
      (code >= 0x20 && code <= 0x7e) ||
      (code >= 0xa0 && code <= 0xff) ||
      WIN_ANSI_EXTRA.has(char)
    if (supported) {
      result += char
    }
  }
  return result.replace(/[ \t]{2,}/g, ' ').trim()
}

export function isSupportedLogo(bytes: Buffer): boolean {
  const isPng = bytes.length > 8 && bytes.readUInt32BE(0) === 0x89504e47
  const isJpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  return isPng || isJpeg
}

function printableQuote(quote: SaleQuoteDocument): SaleQuoteDocument {
  return {
    ...quote,
    customerName: toPdfText(quote.customerName) || 'Cliente',
    customerDocument: quote.customerDocument ? toPdfText(quote.customerDocument) : null,
    customerPhone: quote.customerPhone ? toPdfText(quote.customerPhone) : null,
    lines: quote.lines.map((line) => ({
      ...line,
      description: toPdfText(line.description) || 'Producto',
      quantity: toPdfText(line.quantity),
    })),
  }
}

function printableBusiness(business: SaleQuoteBusiness): SaleQuoteBusiness {
  return {
    ...business,
    tradeName: toPdfText(business.tradeName),
    legalName: toPdfText(business.legalName),
    rif: toPdfText(business.rif),
    address: toPdfText(business.address),
    phone: toPdfText(business.phone),
    email: toPdfText(business.email),
    website: toPdfText(business.website),
    terms: toPdfText(business.terms),
  }
}

/** Letter-size PDF of a sales quote. */
export function renderSaleQuotePdf(
  rawQuote: SaleQuoteDocument,
  rawBusiness: SaleQuoteBusiness
): Promise<Buffer> {
  const quote = printableQuote(rawQuote)
  const business = printableBusiness(rawBusiness)
  const doc = new PDFDocument({
    size: 'LETTER',
    margin: MARGIN,
    info: {
      Title: `Presupuesto N° ${quote.number}`,
      Author: business.tradeName || 'Nega POS',
    },
  })

  const chunks: Buffer[] = []
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  const pageWidth = doc.page.width - MARGIN * 2
  const accent = /^#[0-9a-f]{6}$/i.test(business.accentColor) ? business.accentColor : '#1a1a1a'

  drawHeader(doc, quote, business, pageWidth, accent)
  drawCustomer(doc, quote, pageWidth)
  drawLines(doc, quote, accent)
  drawTotals(doc, quote, pageWidth, accent)
  drawNotes(doc, quote, business, pageWidth)

  doc.end()
  return done
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  quote: SaleQuoteDocument,
  business: SaleQuoteBusiness,
  pageWidth: number,
  accent: string
) {
  const top = MARGIN
  let textX = MARGIN

  if (business.logo && isSupportedLogo(business.logo)) {
    try {
      doc.image(business.logo, MARGIN, top, { fit: [70, 70] })
      textX = MARGIN + 82
    } catch {
      textX = MARGIN
    }
  }

  const infoWidth = pageWidth - (textX - MARGIN) - 180
  doc.fillColor('#111111').font('Helvetica-Bold').fontSize(15)
  doc.text(business.tradeName || 'Presupuesto', textX, top, { width: infoWidth })

  doc.font('Helvetica').fontSize(8.5).fillColor(MUTED)
  const details = [
    business.legalName,
    business.rif ? `RIF: ${business.rif}` : '',
    business.address,
    [business.phone, business.email].filter(Boolean).join('  ·  '),
    business.website,
  ].filter((line) => line.trim())
  for (const line of details) {
    doc.text(line, textX, doc.y + 1, { width: infoWidth })
  }
  const leftBottom = Math.max(doc.y, top + 70)

  const boxX = MARGIN + pageWidth - 170
  doc.font('Helvetica-Bold').fontSize(16).fillColor(accent)
  doc.text('PRESUPUESTO', boxX, top, { width: 170, align: 'right' })
  doc.font('Helvetica').fontSize(9).fillColor('#111111')
  doc.text(`N° ${quote.number}`, boxX, doc.y + 2, { width: 170, align: 'right' })
  doc.text(`Fecha: ${quote.issuedOn}`, boxX, doc.y + 1, { width: 170, align: 'right' })
  if (quote.validUntil) {
    doc.text(`Válido hasta: ${quote.validUntil}`, boxX, doc.y + 1, { width: 170, align: 'right' })
  }

  const bottom = Math.max(leftBottom, doc.y) + 12
  doc
    .moveTo(MARGIN, bottom)
    .lineTo(MARGIN + pageWidth, bottom)
    .lineWidth(1.5)
    .strokeColor(accent)
    .stroke()
  doc.y = bottom + 12
}

function drawCustomer(doc: PDFKit.PDFDocument, quote: SaleQuoteDocument, pageWidth: number) {
  doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED)
  doc.text('CLIENTE', MARGIN, doc.y, { width: pageWidth })
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#111111')
  doc.text(quote.customerName, MARGIN, doc.y + 2, { width: pageWidth })

  const extra = [
    quote.customerDocument ? `RIF/CI: ${quote.customerDocument}` : '',
    quote.customerPhone ? `Teléfono: ${quote.customerPhone}` : '',
  ].filter(Boolean)
  if (extra.length > 0) {
    doc.font('Helvetica').fontSize(9).fillColor(MUTED)
    doc.text(extra.join('   '), MARGIN, doc.y + 1, { width: pageWidth })
  }
  doc.y += 14
}

function drawTableHeader(doc: PDFKit.PDFDocument, accent: string) {
  const y = doc.y
  const width = COLUMNS.reduce((sum, column) => sum + column.width, 0)
  doc.rect(MARGIN, y, width, 20).fill(accent)
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff')
  let x = MARGIN
  for (const column of COLUMNS) {
    doc.text(column.label, x + 6, y + 6, { width: column.width - 12, align: column.align })
    x += column.width
  }
  doc.y = y + 20
}

function drawLines(doc: PDFKit.PDFDocument, quote: SaleQuoteDocument, accent: string) {
  const bottomLimit = doc.page.height - MARGIN - 40
  const tableWidth = COLUMNS.reduce((sum, column) => sum + column.width, 0)

  drawTableHeader(doc, accent)

  quote.lines.forEach((line, index) => {
    doc.font('Helvetica').fontSize(9)
    const contentHeight = Math.max(
      ...COLUMNS.map((column) => doc.heightOfString(line[column.key], { width: column.width - 12 }))
    )
    const rowHeight = Math.max(20, contentHeight + 10)

    if (doc.y + rowHeight > bottomLimit) {
      doc.addPage()
      drawTableHeader(doc, accent)
    }

    const y = doc.y
    if (index % 2 === 1) {
      doc.rect(MARGIN, y, tableWidth, rowHeight).fill('#f5f5f5')
    }

    doc.font('Helvetica').fontSize(9).fillColor('#111111')
    let x = MARGIN
    for (const column of COLUMNS) {
      doc.text(line[column.key], x + 6, y + 5, { width: column.width - 12, align: column.align })
      x += column.width
    }

    doc
      .moveTo(MARGIN, y + rowHeight)
      .lineTo(MARGIN + tableWidth, y + rowHeight)
      .lineWidth(0.5)
      .strokeColor(BORDER)
      .stroke()
    doc.y = y + rowHeight
  })
}

function drawTotals(
  doc: PDFKit.PDFDocument,
  quote: SaleQuoteDocument,
  pageWidth: number,
  accent: string
) {
  const rows: Array<{ label: string; value: string; strong?: boolean }> = [
    { label: 'Subtotal', value: quote.subtotal },
  ]
  if (quote.discount) {
    rows.push({ label: 'Descuento', value: `- ${quote.discount}` })
  }
  rows.push({ label: 'TOTAL', value: quote.total, strong: true })

  const blockWidth = 300
  const labelWidth = 100
  const valueWidth = blockWidth - labelWidth - 10
  const labelX = MARGIN + pageWidth - blockWidth
  const valueX = labelX + labelWidth + 10

  const needed = rows.length * 34 + 30
  if (doc.y + needed > doc.page.height - MARGIN) {
    doc.addPage()
  }

  let y = doc.y + 10
  for (const row of rows) {
    doc
      .font(row.strong ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(row.strong ? 12 : 10)
      .fillColor(row.strong ? accent : '#111111')
    const height = Math.max(
      doc.heightOfString(row.label, { width: labelWidth }),
      doc.heightOfString(row.value, { width: valueWidth })
    )
    doc.text(row.label, labelX, y, { width: labelWidth, align: 'right' })
    doc.text(row.value, valueX, y, { width: valueWidth, align: 'right' })
    y += height + (row.strong ? 6 : 4)
  }

  if (quote.rateLabel) {
    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
    doc.text(`Tasa usada: ${quote.rateLabel}`, labelX, y + 2, { width: blockWidth, align: 'right' })
    y = doc.y
  }
  doc.y = y + 16
}

function drawNotes(
  doc: PDFKit.PDFDocument,
  quote: SaleQuoteDocument,
  business: SaleQuoteBusiness,
  pageWidth: number
) {
  const terms = business.terms.trim()
  if (terms) {
    if (doc.y + 60 > doc.page.height - MARGIN) {
      doc.addPage()
    }
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#111111')
    doc.text('Condiciones', MARGIN, doc.y, { width: pageWidth })
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED)
    doc.text(terms, MARGIN, doc.y + 2, { width: pageWidth })
    doc.y += 10
  }

  const notice = [
    'Este documento es un presupuesto y no constituye una factura.',
    quote.rateLabel
      ? 'Los montos se calcularon con la tasa del día de emisión y pueden variar al momento del pago.'
      : '',
  ]
    .filter(Boolean)
    .join(' ')
  doc.font('Helvetica-Oblique').fontSize(8).fillColor(MUTED)
  doc.text(notice, MARGIN, doc.y, { width: pageWidth })
}
