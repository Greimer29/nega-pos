import { describe, expect, it } from 'vitest'
import type { CatalogProduct } from '@/features/ventas/types'
import type { Material } from '@/features/materials/types'
import type { CartLine } from '@/features/ventas/utils/ventas-cart-lines'
import {
  removeCartLine,
  setCartLineFormulaMaterials,
  setCartLineKitchenNote,
  setCartLineQuantity,
  setCartLineUnitPrice,
  toggleCartLineWholesale,
  updateServiceCartLine,
} from '@/features/ventas/utils/ventas-cart-edit'

const rice = {
  id: 1,
  sale_price_usd: '2.00',
  wholesale_sale_price_usd: '18.00',
  sale_unit: 'UND',
} as unknown as CatalogProduct

const meat = {
  id: 2,
  sale_price_usd: '10.00',
  cost_usd: '5.00',
  sale_unit: 'KG',
  formula: { materials: [{ material_id: 7, quantity: '1' }] },
} as unknown as CatalogProduct

const ribbon = {
  id: 9,
  unit: 'MTS',
  salePriceUsd: '1.50',
  wholesaleSalePriceUsd: '12.00',
} as unknown as Material

function lines(): CartLine[] {
  return [
    { id: 'a', kind: 'catalog', product: rice, quantity: 2 },
    { id: 'b', kind: 'catalog', product: meat, quantity: 1.5 },
    { id: 'c', kind: 'material', material: ribbon, quantity: 3 },
  ]
}

describe('setCartLineQuantity', () => {
  it('rounds to the line unit and removes the line at zero or less', () => {
    expect(setCartLineQuantity(lines(), 'a', 2.6)[0].quantity).toBe(3)
    expect(setCartLineQuantity(lines(), 'b', 1.256)[1].quantity).toBe(1.26)
    expect(setCartLineQuantity(lines(), 'c', 0).map((line) => line.id)).toEqual(['a', 'b'])
    expect(setCartLineQuantity(lines(), 'a', -1).map((line) => line.id)).toEqual(['b', 'c'])
  })

  it('ignores unknown lines', () => {
    const current = lines()
    expect(setCartLineQuantity(current, 'zzz', 5)).toBe(current)
  })
})

describe('toggleCartLineWholesale', () => {
  it('switches between pack and retail price for products and materials', () => {
    const onProduct = toggleCartLineWholesale(lines(), 'a', true)[0]
    expect(onProduct).toMatchObject({ isWholesale: true, unitPriceUsd: 18 })
    const offProduct = toggleCartLineWholesale([onProduct], 'a', false)[0]
    expect(offProduct).toMatchObject({ isWholesale: false, unitPriceUsd: 2 })

    const onMaterial = toggleCartLineWholesale(lines(), 'c', true)[2]
    expect(onMaterial).toMatchObject({ isWholesale: true, unitPriceUsd: 12 })
  })

  it('keeps the retail price when there is no pack price', () => {
    const noPack: CartLine[] = [
      {
        id: 'x',
        kind: 'catalog',
        product: { ...rice, wholesale_sale_price_usd: null } as unknown as CatalogProduct,
        quantity: 1,
      },
    ]
    expect(toggleCartLineWholesale(noPack, 'x', true)[0]).toMatchObject({
      isWholesale: true,
      unitPriceUsd: 2,
    })
  })
})

describe('line edits', () => {
  it('never sets a negative unit price', () => {
    expect(setCartLineUnitPrice(lines(), 'a', -4)[0].unitPriceUsd).toBe(0)
    expect(setCartLineUnitPrice(lines(), 'a', 1.75)[0].unitPriceUsd).toBe(1.75)
  })

  it('trims kitchen notes, clears empty ones and skips material lines', () => {
    const withNote = setCartLineKitchenNote(lines(), 'a', '  sin sal  ')[0]
    expect(withNote.kind === 'catalog' && withNote.kitchenNote).toBe('sin sal')
    const cleared = setCartLineKitchenNote(lines(), 'a', '   ')[0]
    expect(cleared.kind === 'catalog' && cleared.kitchenNote).toBeNull()
    expect(setCartLineKitchenNote(lines(), 'c', 'nota')[2]).toEqual(lines()[2])
  })

  it('updates a service line quantity, price and detail', () => {
    const updated = updateServiceCartLine(lines(), 'a', {
      quantity: 4,
      unitPriceUsd: 7,
      detail: 'Bordado nombre',
    })[0]
    expect(updated).toMatchObject({ quantity: 4, unitPriceUsd: 7, detail: 'Bordado nombre' })
  })

  it('removes a line by id', () => {
    expect(removeCartLine(lines(), 'b').map((line) => line.id)).toEqual(['a', 'c'])
  })
})

describe('setCartLineFormulaMaterials', () => {
  it('restores the base recipe with null', () => {
    const custom = setCartLineFormulaMaterials(lines(), 'b', [
      { material_id: 7, quantity_per_unit: 2 },
    ])
    const restored = setCartLineFormulaMaterials(custom, 'b', null)[1]
    expect(restored.kind === 'catalog' && restored.formulaMaterials).toBeNull()
  })

  it('keeps the price when only base materials change', () => {
    const line = setCartLineFormulaMaterials(lines(), 'b', [
      { material_id: 7, quantity_per_unit: 2 },
    ])[1]
    expect(line).toMatchObject({ formulaMaterials: [{ material_id: 7, quantity_per_unit: 2 }] })
    expect(line.unitPriceUsd).toBeUndefined()
  })

  it('reprices with the product margin when a material is added', () => {
    const line = setCartLineFormulaMaterials(
      lines(),
      'b',
      [
        { material_id: 7, quantity_per_unit: 1 },
        { material_id: 8, quantity_per_unit: 1 },
      ],
      [
        { material_id: 7, quantity_per_unit: 1, material: { id: 7, code: 'M7', name: 'Res', last_purchase_price_usd: '5.00' } },
        { material_id: 8, quantity_per_unit: 1, material: { id: 8, code: 'M8', name: 'Cerdo', last_purchase_price_usd: '3.00' } },
      ]
    )[1]
    expect(line.unitPriceUsd).toBe(16)
  })

  it('leaves material lines untouched', () => {
    expect(setCartLineFormulaMaterials(lines(), 'c', null)[2]).toEqual(lines()[2])
  })
})
