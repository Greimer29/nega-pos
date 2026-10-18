import { describe, expect, it } from 'vitest'
import {
  cartLineUnitPrice,
  normalizeDraftCartLine,
  type CartLine,
} from '@/features/ventas/utils/ventas-cart-lines'
import type { VentasCartDraftLine } from '@/features/ventas/utils/ventas-cart-draft'

describe('ventas cart lines', () => {
  it('uses an explicitly edited unit price before any catalog price', () => {
    const line = {
      id: 'product-1',
      kind: 'catalog',
      product: { sale_price_usd: '12.50' },
      quantity: 2,
      unitPriceUsd: 9.25,
    } as CartLine

    expect(cartLineUnitPrice(line)).toBe(9.25)
  })

  it('uses the product wholesale price when wholesale is selected', () => {
    const line = {
      id: 'product-1',
      kind: 'catalog',
      product: { sale_price_usd: '12.50', wholesale_sale_price_usd: '10.00' },
      quantity: 2,
      isWholesale: true,
    } as CartLine

    expect(cartLineUnitPrice(line)).toBe(10)
  })

  it('normalizes material drafts and returns null for incomplete lines', () => {
    const material = { id: 4, salePriceUsd: '3.75' }
    const draft: VentasCartDraftLine = {
      id: 'material-4',
      kind: 'material',
      material: material as VentasCartDraftLine['material'],
      quantity: 3,
      isWholesale: false,
    }

    expect(normalizeDraftCartLine(draft)).toMatchObject({
      id: 'material-4',
      kind: 'material',
      material,
      quantity: 3,
    })
    expect(
      normalizeDraftCartLine({
        id: 'invalid',
        kind: 'catalog',
        quantity: 1,
      })
    ).toBeNull()
  })
})
