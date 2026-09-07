import { describe, expect, it } from 'vitest'
import {
  formatInventoryQuantity,
  inventoryQuantityDecimals,
  normalizeInventoryQuantity,
} from './inventory-units'

describe('inventoryQuantityDecimals', () => {
  it('usa enteros para UND/PAR/CAJ/ROL/SET', () => {
    for (const unit of ['UND', 'PAR', 'CAJ', 'ROL', 'SET']) {
      expect(inventoryQuantityDecimals(unit)).toBe(0)
    }
  })

  it('usa 2 decimales para MTS y KG', () => {
    expect(inventoryQuantityDecimals('MTS')).toBe(2)
    expect(inventoryQuantityDecimals('KG')).toBe(2)
  })
})

describe('normalizeInventoryQuantity', () => {
  it('redondea enteros y conserva signos negativos de movimiento', () => {
    expect(normalizeInventoryQuantity(2.4, 'UND')).toBe(2)
    expect(normalizeInventoryQuantity(2.6, 'UND')).toBe(3)
    expect(normalizeInventoryQuantity(-1.2, 'UND')).toBe(-1)
  })

  it('limita MTS/KG a 2 decimales', () => {
    expect(normalizeInventoryQuantity(1.239, 'MTS')).toBe(1.24)
    expect(normalizeInventoryQuantity(0.001, 'KG')).toBe(0)
  })
})

describe('formatInventoryQuantity', () => {
  it('omite decimales innecesarios en enteros', () => {
    expect(formatInventoryQuantity(3, 'UND')).toBe('3')
  })
})
