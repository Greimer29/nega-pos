import { buildSaleQuoteDocument, type SaleQuoteInput } from '#utils/sale_quote_document'
import { isSupportedLogo, renderSaleQuotePdf, toPdfText } from '#utils/sale_quote_pdf'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

function input(overrides: Partial<SaleQuoteInput> = {}): SaleQuoteInput {
  return {
    saleId: 22,
    customerName: 'Greimer',
    customerDocument: 'V-12345678',
    customerPhone: '0414-0000000',
    lines: [
      {
        description: 'Carne Molida',
        size: null,
        unit: 'KG',
        quantity: 1.5,
        unitPriceBase: 0.3,
        subtotalBase: 0.45,
        isWholesale: false,
        unitsPerPack: null,
      },
      {
        description: 'Mayonesa - 900',
        size: null,
        unit: 'UND',
        quantity: 2,
        unitPriceBase: 0.56,
        subtotalBase: 1.12,
        isWholesale: true,
        unitsPerPack: 6,
      },
      {
        description: 'Camisa',
        size: 'M',
        unit: 'UND',
        quantity: 1,
        unitPriceBase: 0.08,
        subtotalBase: 0.08,
        isWholesale: false,
        unitsPerPack: null,
      },
    ],
    discountBase: 0.165,
    totalBase: 1.485,
    baseCurrencyCode: 'XAU',
    currencyCode: 'USD',
    rate: 100,
    validityDays: 3,
    issuedAt: DateTime.fromISO('2026-10-23T22:30:00', { zone: 'America/Caracas' }),
    ...overrides,
  }
}

test.group('buildSaleQuoteDocument', () => {
  test('converts amounts from base currency with the given rate', ({ assert }) => {
    const quote = buildSaleQuoteDocument(input())

    assert.equal(quote.number, '22')
    assert.deepEqual(
      quote.lines.map((line) => [line.unitPrice, line.subtotal]),
      [
        ['$ 30,00', '$ 45,00'],
        ['$ 56,00', '$ 112,00'],
        ['$ 8,00', '$ 8,00'],
      ]
    )
    assert.equal(quote.subtotal, '$ 165,00')
    assert.equal(quote.discount, '$ 16,50')
    assert.equal(quote.total, '$ 148,50')
    assert.equal(quote.rateLabel, '1 Au = $ 100,00')
  })

  test('describes units, wholesale packs and sizes', ({ assert }) => {
    const quote = buildSaleQuoteDocument(input())

    assert.deepEqual(
      quote.lines.map((line) => [line.description, line.quantity]),
      [
        ['Carne Molida', '1,5 kg'],
        ['Mayonesa - 900', '2 paq. x6'],
        ['Camisa - Talla M', '1 und'],
      ]
    )
  })

  test('uses the shop calendar for issue and expiry dates', ({ assert }) => {
    const quote = buildSaleQuoteDocument(input())

    assert.equal(quote.issuedOn, '23/10/2026')
    assert.equal(quote.validUntil, '26/10/2026')
    assert.isNull(buildSaleQuoteDocument(input({ validityDays: 0 })).validUntil)
  })

  test('omits the rate in base currency and the discount when there is none', ({ assert }) => {
    const quote = buildSaleQuoteDocument(
      input({ currencyCode: 'XAU', rate: 1, discountBase: 0, totalBase: 1.65 })
    )

    assert.isNull(quote.rateLabel)
    assert.isNull(quote.discount)
    assert.equal(quote.total, 'Au 1,65')
    assert.equal(quote.lines[0].unitPrice, 'Au 0,30')
  })

  test('formats bolivares with thousands separators', ({ assert }) => {
    const quote = buildSaleQuoteDocument(input({ currencyCode: 'VES', rate: 90000 }))

    assert.equal(quote.total, 'Bs 133.650,00')
    assert.equal(quote.rateLabel, '1 Au = Bs 90.000,00')
  })
})

test.group('isSupportedLogo', () => {
  test('accepts PNG and JPEG signatures only', ({ assert }) => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0])
    const webp = Buffer.from('RIFF\u0000\u0000\u0000\u0000WEBP', 'latin1')

    assert.isTrue(isSupportedLogo(png))
    assert.isTrue(isSupportedLogo(jpeg))
    assert.isFalse(isSupportedLogo(webp))
  })
})

test.group('toPdfText', () => {
  test('keeps Spanish text and WinAnsi symbols, drops emoji and other scripts', ({ assert }) => {
    assert.equal(
      toPdfText('Señora María 😀 — «Panadería» 100% (½ kg) € 🔥 中文'),
      'Señora María — «Panadería» 100% (½ kg) €'
    )
    assert.equal(toPdfText('Línea 1\nLínea 2'), 'Línea 1\nLínea 2')
    assert.equal(toPdfText('😀'), '')
  })
})

test.group('renderSaleQuotePdf', () => {
  test('renders emoji names and huge amounts without failing', async ({ assert }) => {
    const quote = buildSaleQuoteDocument(
      input({
        customerName: 'Cliente 😀 con nombre muy largo para que el texto tenga que ajustarse',
        currencyCode: 'VES',
        rate: 90000,
        lines: Array.from({ length: 60 }, (_, index) => ({
          description: `Producto ${index} 🔥 con descripción larga para ajustar el texto`,
          size: null,
          unit: 'UND',
          quantity: 99,
          unitPriceBase: 12345.6789,
          subtotalBase: 1222222.2111,
          isWholesale: false,
          unitsPerPack: null,
        })),
        totalBase: 73333332.666,
      })
    )

    const pdf = await renderSaleQuotePdf(quote, {
      tradeName: 'Negocio 😀',
      legalName: '',
      rif: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      terms: 'Condiciones ✅',
      accentColor: '#0f4c3a',
      logo: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
    })

    assert.equal(pdf.subarray(0, 5).toString('latin1'), '%PDF-')
    assert.isAbove(pdf.length, 2000)
  })
})
