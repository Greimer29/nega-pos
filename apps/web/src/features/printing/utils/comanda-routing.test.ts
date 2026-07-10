import { describe, expect, it } from 'vitest'
import { DEFAULT_PRINT_CONFIG } from '@/features/printing/types'
import { renderComandaLines } from '@/features/printing/templates/format-utils'
import {
  MATERIALS_CATEGORY,
  UNCATEGORIZED_CATEGORY,
  groupSaleLinesByComandaPrinter,
  resolveLineCategory,
} from '@/features/printing/utils/comanda-routing'
import type { Sale, SaleLine } from '@/features/ventas/types'

function line(partial: Partial<SaleLine> & Pick<SaleLine, 'id'>): SaleLine {
  return {
    catalog_product_id: null,
    material_id: null,
    description: 'Item',
    quantity: '1',
    returned_quantity: '0',
    unit_price_usd: '1',
    subtotal_usd: '1',
    ...partial,
  }
}

const baseSale: Sale = {
  id: 1,
  code: '0000000001',
  customer_id: null,
  guest_name: 'Cliente',
  payment_method_code: 'cash_usd',
  payment_method: { code: 'cash_usd', name: 'Efectivo USD', currency_code: 'USD' },
  payment_type: 'CASH',
  billing_mode: 'FAST',
  order_status: 'DELIVERED',
  amount_paid_usd: '10',
  balance_usd: '0',
  credit_due_date: null,
  total_usd: '10',
  total_bs: null,
  usd_rate: null,
  status: 'COMPLETED',
  sold_at: '2026-01-01T12:00:00.000Z',
  confirmed_at: '2026-01-01T12:00:00.000Z',
  returned_at: null,
  customer: null,
  lines: [],
  created_at: '2026-01-01T12:00:00.000Z',
  updated_at: '2026-01-01T12:00:00.000Z',
}

describe('resolveLineCategory', () => {
  it('uses catalog product category when present', () => {
    expect(
      resolveLineCategory(
        line({
          id: 1,
          catalog_product: { id: 1, name: 'Camisa', category: 'Uniforme' },
        })
      )
    ).toBe('Uniforme')
  })
})

describe('renderComandaLines', () => {
  it('renders product code, name and quantity', () => {
    const html = renderComandaLines([
      line({
        id: 1,
        quantity: '2',
        catalog_product: { id: 1, name: 'Hamburguesa', sale_unit: 'UND' },
      }),
      line({
        id: 2,
        quantity: '1.5',
        catalog_product: { id: 2, name: 'Tela', sale_unit: 'MTS' },
      }),
    ])

    expect(html).toContain('0000001')
    expect(html).toContain('Hamburguesa')
    expect(html).toContain('2 UND')
    expect(html).toContain('0000002')
    expect(html).toContain('Tela')
    expect(html).toContain('1,50 MTS')
    expect(html).not.toContain('USD')
    expect(html).not.toContain('line-row')
  })
})

describe('groupSaleLinesByComandaPrinter', () => {
  it('returns a single group with default comanda printer when routing is disabled', () => {
    const sale: Sale = {
      ...baseSale,
      lines: [
        line({
          id: 1,
          catalog_product: { id: 1, name: 'A', category: 'Uniforme' },
        }),
      ],
    }

    const config = {
      ...DEFAULT_PRINT_CONFIG,
      documents: {
        ...DEFAULT_PRINT_CONFIG.documents,
        comanda: {
          ...DEFAULT_PRINT_CONFIG.documents.comanda,
          deviceName: 'POS-COCINA',
        },
      },
    }

    const groups = groupSaleLinesByComandaPrinter(sale, config)
    expect(groups.size).toBe(1)
    expect(groups.get('POS-COCINA')).toHaveLength(1)
  })

  it('groups lines by category rules when routing is enabled', () => {
    const sale: Sale = {
      ...baseSale,
      lines: [
        line({
          id: 1,
          catalog_product: { id: 1, name: 'A', category: 'Uniforme' },
        }),
        line({
          id: 2,
          catalog_product: { id: 2, name: 'B', category: 'Calzado' },
        }),
      ],
    }

    const config = {
      ...DEFAULT_PRINT_CONFIG,
      categoryRouting: {
        comanda: {
          enabled: true,
          rules: [
            { category: 'Uniforme', deviceName: 'POS-UNIFORME' },
            { category: 'Calzado', deviceName: 'POS-CALZADO' },
          ],
        },
      },
    }

    const groups = groupSaleLinesByComandaPrinter(sale, config)
    expect(groups.size).toBe(2)
    expect(groups.get('POS-UNIFORME')).toHaveLength(1)
    expect(groups.get('POS-CALZADO')).toHaveLength(1)
  })

  it('matches category rules without case sensitivity', () => {
    const sale: Sale = {
      ...baseSale,
      lines: [
        line({
          id: 1,
          catalog_product: { id: 1, name: 'A', category: 'uniforme' },
        }),
      ],
    }

    const config = {
      ...DEFAULT_PRINT_CONFIG,
      categoryRouting: {
        comanda: {
          enabled: true,
          rules: [{ category: 'Uniforme', deviceName: 'POS-UNIFORME' }],
        },
      },
    }

    const groups = groupSaleLinesByComandaPrinter(sale, config)
    expect(groups.get('POS-UNIFORME')).toHaveLength(1)
  })

  it('uses default comanda printer for categories without a rule', () => {
    const sale: Sale = {
      ...baseSale,
      lines: [
        line({
          id: 1,
          catalog_product: { id: 1, name: 'A', category: 'Otros' },
        }),
      ],
    }

    const config = {
      ...DEFAULT_PRINT_CONFIG,
      documents: {
        ...DEFAULT_PRINT_CONFIG.documents,
        comanda: {
          ...DEFAULT_PRINT_CONFIG.documents.comanda,
          deviceName: 'POS-DEFAULT',
        },
      },
      categoryRouting: {
        comanda: {
          enabled: true,
          rules: [{ category: 'Uniforme', deviceName: 'POS-UNIFORME' }],
        },
      },
    }

    const groups = groupSaleLinesByComandaPrinter(sale, config)
    expect(groups.size).toBe(1)
    expect(groups.get('POS-DEFAULT')).toHaveLength(1)
  })
})
