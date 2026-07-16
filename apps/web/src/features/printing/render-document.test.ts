import { describe, expect, it } from 'vitest'
import { createSampleSale, renderSaleDocument } from '@/features/printing/render-document'
import { DEFAULT_PRINT_CONFIG } from '@/features/printing/types'
import { renderFormatBody } from '@/features/printing/utils/format-template-engine'
import { createBuiltinFormats } from '@/features/printing/utils/print-formats'

describe('renderSaleDocument', () => {
  const sale = createSampleSale()
  const config = DEFAULT_PRINT_CONFIG

  it('renders invoice HTML with receipt structure, lines and totals', () => {
    const rendered = renderSaleDocument('invoice', sale, config)

    expect(rendered.title).toContain('0000000001')
    expect(rendered.html).toContain('0000000001')
    expect(rendered.html).toContain('Camisa escolar')
    expect(rendered.html).toContain('Tela al corte')
    expect(rendered.html).toContain('2 x 10,00 UND')
    expect(rendered.html).toContain('USD 20,00')
    expect(rendered.html).toContain('1,50 x 5,00 MTS')
    expect(rendered.html).toContain('USD 5,00')
    expect(rendered.html).toContain('RECIBO')
    expect(rendered.html).toContain('TOTAL')
    expect(rendered.html).toContain('MESERO:')
    expect(rendered.html).toContain('USUA:')
    expect(rendered.html).toContain('T01')
    expect(rendered.html).toContain('C01')
    expect(rendered.html).toContain('--------------------')
    expect(rendered.html).toContain('J-12345678-9')
    expect(rendered.html).toContain('<style>')
    expect(rendered.html).toContain('<!DOCTYPE html>')
  })

  it('renders invoice with native currency when rate and total_bs are present', () => {
    const rendered = renderSaleDocument(
      'invoice',
      {
        ...sale,
        total_bs: '912.50',
        usd_rate: '36.5000',
        payment_method: { code: 'cash_bs', name: 'Efectivo Bs', currency_code: 'VES' },
      },
      config
    )

    expect(rendered.html).toContain('VES')
    expect(rendered.html).toContain('PAGO EFECTIVO BS')
  })

  it('renders invoice with fractional XAU totals', () => {
    const rendered = renderSaleDocument(
      'invoice',
      {
        ...sale,
        total_usd: '50.0000',
        amount_paid_usd: '50.0000',
        balance_usd: '0.0000',
        total_bs: '0.0200',
        usd_rate: '0.0004',
        payment_method: { code: 'gold_xau', name: 'Oro XAU', currency_code: 'XAU' },
      },
      config
    )

    expect(rendered.html).toContain('XAU 0,02')
  })

  it('renders invoice totals with subtotal and paid amounts', () => {
    const rendered = renderSaleDocument('invoice', sale, config)

    expect(rendered.html).toContain('TOTAL')
    expect(rendered.html).toContain('PAGO')
    expect(rendered.html).toContain('USD 25,00')
  })

  it('renders credit invoice with credit row', () => {
    const rendered = renderSaleDocument(
      'invoice',
      {
        ...sale,
        payment_type: 'CREDIT',
        amount_paid_usd: '0.0000',
        balance_usd: '25.0000',
        payment_method: null,
        payment_method_code: null,
      },
      config
    )

    expect(rendered.html).toContain('CRÉDITO')
    expect(rendered.html).toContain('USD 25,00')
  })

  it('renders station label from print config', () => {
    const rendered = renderSaleDocument('invoice', sale, {
      ...config,
      ticket: { station_label: 'CAJA1' },
    })

    expect(rendered.html).toContain('CAJA1')
  })

  it('renders delivery note HTML with client and order context', () => {
    const orderSale = {
      ...sale,
      billing_mode: 'ORDER' as const,
      order_status: 'PENDING' as const,
    }
    const rendered = renderSaleDocument('deliveryNote', orderSale, config)

    expect(rendered.html).toContain('NOTA DE DESPACHO')
    expect(rendered.html).toContain('Cliente de ejemplo')
    expect(rendered.html).toContain('PENDING')
    expect(rendered.html).toContain('Recibido conforme')
    expect(rendered.html).not.toContain('USD')
    expect(rendered.html).toContain('<style>')
  })

  it('renders partial delivery note with only selected lines', () => {
    const partialLines = [sale.lines![0]]
    const rendered = renderSaleDocument('deliveryNote', sale, config, {
      lines: partialLines,
      categoryLabel: 'Uniforme',
    })

    expect(rendered.html).toContain('Camisa escolar')
    expect(rendered.html).not.toContain('Pantalón')
    expect(rendered.html).not.toContain('USD')
  })

  it('renders comanda with product, quantity and measure only', () => {
    const rendered = renderSaleDocument('comanda', sale, config)

    expect(rendered.html).toContain('0000001')
    expect(rendered.html).toContain('Camisa escolar')
    expect(rendered.html).toContain('2 UND')
    expect(rendered.html).toContain('1,50 MTS')
    expect(rendered.html).not.toContain('RECIBO')
    expect(rendered.html).not.toContain('Cliente de ejemplo')
    expect(rendered.html).not.toContain('Producto sin formula')
    expect(rendered.html).toContain('NEGA POS')
    expect(rendered.html).toContain('Correlativo de comanda')
    expect(rendered.html).toContain('<style>')
  })

  it('renders kitchen_note lines on comanda only', () => {
    const note =
      '1 sin cebolla, sin mayonesa, sin zanahoria\n2 sin mostaza\n1 sin cebolla'
    const saleWithNote = {
      ...sale,
      lines: [
        {
          ...sale.lines![0],
          quantity: '3',
          kitchen_note: note,
          catalog_product: {
            ...(sale.lines![0].catalog_product ?? {}),
            name: 'Combo de perros',
          },
        },
      ],
    }

    const comanda = renderSaleDocument('comanda', saleWithNote, config)
    expect(comanda.html).toContain('Combo de perros')
    expect(comanda.html).toContain('3 UND')
    expect(comanda.html).toContain('cmd-note')
    expect(comanda.html).toContain('1 sin cebolla, sin mayonesa, sin zanahoria')
    expect(comanda.html).toContain('2 sin mostaza')
    expect(comanda.html).toContain('1 sin cebolla')

    const invoice = renderSaleDocument('invoice', saleWithNote, config)
    expect(invoice.html).toContain('Combo de perros')
    expect(invoice.html).not.toContain('sin mayonesa')
    expect(invoice.html).not.toContain('cmd-note')
  })

  it('renders comanda formula when option is enabled (sorted + fallback)', () => {
    const saleWithFormula = {
      ...sale,
      lines: [
        {
          ...sale.lines![0],
          quantity: '2',
          catalog_product: {
            ...(sale.lines![0].catalog_product ?? {}),
            formula: {
              materials: [
                {
                  quantity: '0.25',
                  material: { id: 1, code: 'M1', name: 'Salchicha Brasilera', unit: 'KG' },
                },
                {
                  quantity: '2',
                  material: { id: 2, code: 'M2', name: 'Pan pequeño', unit: 'UND' },
                },
              ],
            },
          },
        },
        {
          ...sale.lines![1],
          catalog_product: { ...(sale.lines![1].catalog_product ?? {}) },
        },
      ],
    }

    const rendered = renderSaleDocument('comanda', saleWithFormula, config, {
      printFormula: true,
    })

    expect(rendered.html).toContain('0000001')

    const panIndex = rendered.html.indexOf('Pan pequeño')
    const salchIndex = rendered.html.indexOf('Salchicha Brasilera')
    expect(panIndex).toBeGreaterThanOrEqual(0)
    expect(salchIndex).toBeGreaterThanOrEqual(0)
    expect(panIndex).toBeLessThan(salchIndex)

    expect(rendered.html).toContain('2 UND')
    expect(rendered.html).toContain('4 UND')
    expect(rendered.html).toContain('0,50 KG')
    expect(rendered.html).toContain('Producto sin formula')
  })

  it('renders comanda using effective_formula_materials override', () => {
    const saleWithEffectiveFormula = {
      ...sale,
      lines: [
        {
          ...sale.lines![0],
          quantity: '2',
          effective_formula_materials: [
            {
              material_id: 3,
              quantity_per_unit: '1.500',
              material: { id: 3, code: 'M3', name: 'Hilo extra', unit: 'UND' },
            },
          ],
          catalog_product: {
            ...(sale.lines![0].catalog_product ?? {}),
            formula: {
              materials: [
                {
                  quantity: '0.25',
                  material: { id: 1, code: 'M1', name: 'Salchicha Brasilera', unit: 'KG' },
                },
              ],
            },
          },
        },
      ],
    }

    const rendered = renderSaleDocument('comanda', saleWithEffectiveFormula, config, {
      printFormula: true,
    })

    expect(rendered.html).toContain('Hilo extra')
    expect(rendered.html).toContain('3 UND')
    expect(rendered.html).not.toContain('Salchicha Brasilera')
  })

  it('escapes HTML in business and product names', () => {
    const rendered = renderSaleDocument(
      'invoice',
      {
        ...sale,
        lines: [
          {
            ...sale.lines![0],
            catalog_product: { id: 1, name: '<script>alert(1)</script>' },
          },
        ],
      },
      {
        ...config,
        business: {
          ...config.business,
          legalName: 'Tienda & Co',
        },
      }
    )

    expect(rendered.html).toContain('Tienda &amp; Co')
    expect(rendered.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(rendered.html).not.toContain('<script>alert(1)</script>')
  })
})

describe('renderFormatBody', () => {
  const sale = createSampleSale()
  const [invoiceFormat] = createBuiltinFormats()

  it('replaces custom placeholders in template body', () => {
    const body = renderFormatBody(
      {
        ...invoiceFormat,
        bodyHtml: '<div>{{sale.code}}</div><div>{{sale.total}}</div>',
      },
      sale,
      DEFAULT_PRINT_CONFIG.business,
      DEFAULT_PRINT_CONFIG.ticket
    )

    expect(body).toContain('0000000001')
    expect(body).toContain('25.00')
  })
})
