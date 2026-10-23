import { describe, expect, it, vi } from 'vitest'
import type { Material } from '@/features/materials/types'
import type { CatalogProduct } from '@/features/ventas/types'
import type { CartLine } from '@/features/ventas/utils/ventas-cart-lines'
import { buildVentasCartLines } from '@/features/ventas/utils/ventas-cart-view'

function handlers() {
  return {
    onToggleWholesale: vi.fn(),
    onAdjustFormula: vi.fn(),
    onEditKitchenNote: vi.fn(),
    onEditDetail: vi.fn(),
  }
}

const shoe = {
  id: 3,
  name: 'Zapato',
  sale_price_usd: '30.00',
  sale_unit: 'PAR',
  item_kind: 'PRODUCT',
  wholesale_enabled: false,
} as unknown as CatalogProduct

const burger = {
  id: 4,
  name: 'Hamburguesa',
  sale_price_usd: '5.00',
  sale_unit: 'UND',
  item_kind: 'PRODUCT',
  formula_id: 11,
} as unknown as CatalogProduct

const embroidery = {
  id: 5,
  name: 'Bordado',
  sale_price_usd: '4.00',
  item_kind: 'SERVICE',
  is_service: true,
} as unknown as CatalogProduct

const rice = {
  id: 6,
  name: 'Arroz',
  sale_price_usd: '2.00',
  wholesale_sale_price_usd: '18.00',
  wholesale_units_per_pack: '10',
  wholesale_enabled: true,
} as unknown as CatalogProduct

const ribbon = {
  id: 9,
  code: 'CINTA',
  name: 'Cinta',
  unit: 'MTS',
  salePriceUsd: '1.50',
  wholesaleEnabled: true,
  wholesaleUnitsPerPack: '12',
} as unknown as Material

describe('buildVentasCartLines', () => {
  it('labels sizes, services and units', () => {
    const rows = buildVentasCartLines(
      [
        { id: 'a', kind: 'catalog', product: shoe, quantity: 1, size: '40' },
        { id: 'b', kind: 'catalog', product: embroidery, quantity: 2, detail: 'Logo' },
        { id: 'c', kind: 'material', material: ribbon, quantity: 3 },
      ],
      handlers()
    )
    expect(rows.map((row) => row.metaLabel)).toEqual(['Talla 40', 'Servicio', 'MTS'])
    expect(rows[1]).toMatchObject({ isService: true, detail: 'Logo', listPriceUsd: 4 })
    expect(rows[2]).toMatchObject({ code: 'CINTA', saleUnit: 'MTS', canWholesale: true })
  })

  it('wires formula, kitchen note and service detail actions by line kind', () => {
    const h = handlers()
    const [burgerRow, serviceRow] = buildVentasCartLines(
      [
        { id: 'a', kind: 'catalog', product: burger, quantity: 1 },
        { id: 'b', kind: 'catalog', product: embroidery, quantity: 1 },
      ],
      h
    )

    burgerRow.onAdjustFormula?.()
    burgerRow.onEditKitchenNote?.()
    expect(h.onAdjustFormula).toHaveBeenCalledWith('a')
    expect(h.onEditKitchenNote).toHaveBeenCalledWith('a')
    expect(burgerRow.onEditDetail).toBeUndefined()

    expect(serviceRow.onEditKitchenNote).toBeUndefined()
    expect(serviceRow.onAdjustFormula).toBeUndefined()
    serviceRow.onEditDetail?.()
    expect(h.onEditDetail).toHaveBeenCalledWith('b')
  })

  it('offers wholesale only when the item allows it and shows the pack hint', () => {
    const h = handlers()
    const lines: CartLine[] = [
      { id: 'a', kind: 'catalog', product: rice, quantity: 1, isWholesale: true },
      { id: 'b', kind: 'catalog', product: shoe, quantity: 1 },
      { id: 'c', kind: 'material', material: ribbon, quantity: 1, isWholesale: true },
    ]
    const [riceRow, shoeRow, ribbonRow] = buildVentasCartLines(lines, h)

    expect(riceRow).toMatchObject({
      canWholesale: true,
      isWholesale: true,
      wholesaleHint: '× 10 und',
      listPriceUsd: 18,
      unitPriceUsd: 18,
    })
    riceRow.onToggleWholesale?.(false)
    expect(h.onToggleWholesale).toHaveBeenCalledWith('a', false)

    expect(shoeRow.onToggleWholesale).toBeUndefined()
    expect(shoeRow.wholesaleHint).toBeNull()
    expect(ribbonRow.wholesaleHint).toBe('× 12 und')
  })
})
