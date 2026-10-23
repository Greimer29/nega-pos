import { describe, expect, it } from 'vitest'
import type { LocalPurchaseItem, PurchaseItem } from '@/features/purchases/types'
import {
  formatRateInput,
  localItemCanWholesale,
  localItemCode,
  localItemName,
  localItemUnit,
  localItemUnitCode,
  parseDbItemId,
  purchaseItemToLocal,
  resolveEntryRateInput,
  wholesaleTogglePriceUsd,
} from './purchase-local-items'

function dbItem(overrides: Partial<PurchaseItem>): PurchaseItem {
  return {
    id: 7,
    itemType: 'material',
    quantity: '3.00',
    unitPriceUsd: '2.5000',
    ...overrides,
  } as PurchaseItem
}

const wholesaleMaterial: LocalPurchaseItem = {
  localId: 'local-1',
  itemType: 'material',
  materialId: 5,
  material: {
    id: 5,
    code: 'TELA-1',
    name: 'Tela',
    category: 'Uniforme',
    unit: 'MTS',
    wholesaleEnabled: true,
    wholesaleUnitsPerPack: '12.000',
    wholesaleCostUsd: '6.0000',
  },
  quantity: 2,
  unitPriceUsd: 0.75,
  isWholesale: false,
}

describe('purchaseItemToLocal', () => {
  it('maps a material row and keeps the db id', () => {
    const local = purchaseItemToLocal(
      dbItem({
        materialId: 5,
        material: { id: 5, code: 'TELA-1', name: 'Tela', category: 'Uniforme', unit: 'MTS' },
        isWholesale: true,
      })
    )
    expect(local).toMatchObject({
      localId: 'db-7',
      itemType: 'material',
      materialId: 5,
      quantity: 3,
      unitPriceUsd: 2.5,
      isWholesale: true,
    })
  })

  it('falls back to placeholders when relations are missing', () => {
    expect(purchaseItemToLocal(dbItem({ materialId: 9 })).material).toEqual({
      id: 9,
      code: '#9',
      name: 'Material',
      category: 'Otro',
      unit: 'UND',
    })
    expect(
      purchaseItemToLocal(dbItem({ itemType: 'product', catalogProductId: 4 })).catalogProduct
    ).toEqual({ id: 4, name: 'Producto', category: 'OTHER', saleUnit: 'UND' })
  })

  it('treats machine rows as non-wholesale', () => {
    const local = purchaseItemToLocal(
      dbItem({ itemType: 'machine', machineId: 3, isWholesale: true, unitPriceUsd: null })
    )
    expect(local).toMatchObject({
      itemType: 'machine',
      machineId: 3,
      machine: { id: 3, name: 'Máquina', type: 'OTHER' },
      unitPriceUsd: 0,
      isWholesale: false,
    })
  })
})

describe('local item labels', () => {
  it('describes materials, products and machines', () => {
    expect(localItemCode(wholesaleMaterial)).toBe('TELA-1')
    expect(localItemName(wholesaleMaterial)).toBe('Tela')
    expect(localItemUnitCode(wholesaleMaterial)).toBe('MTS')

    const product: LocalPurchaseItem = {
      localId: 'local-2',
      itemType: 'product',
      catalogProduct: { id: 8, name: 'Gorra', category: 'Uniforme', saleUnit: 'PAR' },
      quantity: 1,
      unitPriceUsd: 4,
    }
    expect(localItemName(product)).toBe('Gorra')
    expect(localItemUnitCode(product)).toBe('PAR')
    expect(localItemCanWholesale(product)).toBe(false)

    const machine: LocalPurchaseItem = {
      localId: 'local-3',
      itemType: 'machine',
      machine: { id: 2, name: 'Recta', type: 'OTHER' },
      quantity: 1,
      unitPriceUsd: 300,
    }
    expect(localItemName(machine)).toBe('Recta')
    expect(localItemUnit(machine)).toBe('Und')
    expect(localItemUnitCode(machine)).toBe('UND')
    expect(localItemCanWholesale(machine)).toBe(false)
  })

  it('shows packs for wholesale lines', () => {
    expect(localItemCanWholesale(wholesaleMaterial)).toBe(true)
    expect(localItemUnit({ ...wholesaleMaterial, isWholesale: true })).toBe('Paq.')
  })
})

describe('wholesaleTogglePriceUsd', () => {
  it('uses the pack cost when turning wholesale on and the unit cost when turning it off', () => {
    expect(wholesaleTogglePriceUsd(wholesaleMaterial, true)).toBe(6)
    expect(wholesaleTogglePriceUsd({ ...wholesaleMaterial, unitPriceUsd: 6 }, false)).toBe(0.5)
  })

  it('keeps the current price when the wholesale cost is missing', () => {
    const noCost: LocalPurchaseItem = {
      ...wholesaleMaterial,
      material: { ...wholesaleMaterial.material!, wholesaleCostUsd: undefined },
    }
    expect(wholesaleTogglePriceUsd(noCost, true)).toBe(0.75)
    expect(wholesaleTogglePriceUsd(noCost, false)).toBe(0.75)
  })

  it('reads a null wholesale cost as zero, as wholesalePackCostUsd does', () => {
    const nullCost: LocalPurchaseItem = {
      ...wholesaleMaterial,
      material: { ...wholesaleMaterial.material!, wholesaleCostUsd: null },
    }
    expect(wholesaleTogglePriceUsd(nullCost, true)).toBe(0)
    expect(wholesaleTogglePriceUsd(nullCost, false)).toBe(0)
  })
})

describe('parseDbItemId', () => {
  it('reads persisted ids and ignores local-only rows', () => {
    expect(parseDbItemId('db-42')).toBe(42)
    expect(parseDbItemId('local-42')).toBeNull()
    expect(parseDbItemId('db-abc')).toBeNull()
  })
})

describe('resolveEntryRateInput', () => {
  const currencies = [
    { code: 'USD', ratePerUsd: '100.0000' },
    { code: 'VES', ratePerUsd: '4000.0000' },
  ]

  it('has no rate for the base currency', () => {
    expect(resolveEntryRateInput('xau', currencies, '36', 40, 'XAU')).toBe('')
  })

  it('prefers the purchase rate, then the configured rate, then the legacy VES rate', () => {
    expect(resolveEntryRateInput('VES', currencies, '36.5', 40, 'XAU')).toBe('36.50')
    expect(resolveEntryRateInput('USD', currencies, null, 40, 'XAU')).toBe('100.00')
    expect(resolveEntryRateInput('VES', [], null, '38.256', 'XAU')).toBe('38.26')
    expect(resolveEntryRateInput('EUR', [], null, 40, 'XAU')).toBe('')
  })
})

describe('formatRateInput', () => {
  it('formats to two decimals and blanks invalid values', () => {
    expect(formatRateInput('36.5')).toBe('36.50')
    expect(formatRateInput(null)).toBe('')
    expect(formatRateInput('')).toBe('')
    expect(formatRateInput('abc')).toBe('')
  })
})
