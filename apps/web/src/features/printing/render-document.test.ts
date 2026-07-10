import { describe, expect, it } from 'vitest'
import { createSampleSale, renderSaleDocument } from '@/features/printing/render-document'
import { DEFAULT_PRINT_CONFIG } from '@/features/printing/types'
import { renderFormatBody } from '@/features/printing/utils/format-template-engine'
import { createBuiltinFormats } from '@/features/printing/utils/print-formats'

describe('renderSaleDocument', () => {
  const sale = createSampleSale()
  const config = DEFAULT_PRINT_CONFIG

  it('renders invoice HTML with sale code, lines and total', () => {
    const rendered = renderSaleDocument('invoice', sale, config)

    expect(rendered.title).toContain('0000000001')
    expect(rendered.html).toContain('0000000001')
    expect(rendered.html).toContain('Camisa escolar')
    expect(rendered.html).toContain('Tela al corte')
    expect(rendered.html).toContain('10.00 x 2')
    expect(rendered.html).toContain('20.00 USD')
    expect(rendered.html).toContain('Método de pago:')
    expect(rendered.html).toContain('FACTURA')
    expect(rendered.html).toContain('<!DOCTYPE html>')
  })

  it('renders invoice payment conversion when rate and total_bs are present', () => {
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

    expect(rendered.html).toContain('Método de pago: Efectivo Bs')
    expect(rendered.html).toContain('Tasa:')
    expect(rendered.html).toContain('Bs/USD')
    expect(rendered.html).toContain('Total VES:')
  })

  it('renders invoice totals with total and paid amounts', () => {
    const rendered = renderSaleDocument('invoice', sale, config)

    expect(rendered.html).toContain('Total:')
    expect(rendered.html).toContain('Pagado:')
    expect(rendered.html).toContain('25.00 USD')
  })

  it('renders credit invoice with zero paid', () => {
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

    expect(rendered.html).toContain('Forma de pago: Crédito')
    expect(rendered.html).toContain('Pagado:')
    expect(rendered.html).toContain('0.00 USD')
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
    expect(rendered.html).not.toContain('FACTURA')
    expect(rendered.html).not.toContain('Cliente de ejemplo')
    expect(rendered.html).not.toContain('Producto sin formula')
    expect(rendered.html).toContain('NEGA POS')
    expect(rendered.html).toContain('Correlativo de comanda')
    expect(rendered.html).not.toContain('Cantidad solicitada')
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
          // sin fórmula: debe mostrar fallback
          catalog_product: { ...(sale.lines![1].catalog_product ?? {}) },
        },
      ],
    }

    const rendered = renderSaleDocument('comanda', saleWithFormula, config, {
      printFormula: true,
    })

    // Código del producto (7 dígitos)
    expect(rendered.html).toContain('0000001')

    // Materiales ordenados por nombre: "Pan..." antes que "Salch..."
    const panIndex = rendered.html.indexOf('Pan pequeño')
    const salchIndex = rendered.html.indexOf('Salchicha Brasilera')
    expect(panIndex).toBeGreaterThanOrEqual(0)
    expect(salchIndex).toBeGreaterThanOrEqual(0)
    expect(panIndex).toBeLessThan(salchIndex)

    // Cantidad+unidad de materiales (sin moneda)
    expect(rendered.html).toContain('2 UND')
    expect(rendered.html).toContain('4 UND')
    expect(rendered.html).toContain('0,50 KG')

    // Fallback si el producto no tiene fórmula
    expect(rendered.html).toContain('Producto sin formula')
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
          name: 'Tienda & Co',
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
      DEFAULT_PRINT_CONFIG.business
    )

    expect(body).toContain('0000000001')
    expect(body).toContain('25.00')
  })
})
