import { describe, expect, it } from 'vitest'
import {
  lineAmountUsdFromQuantity,
  quantityFromLineAmountUsd,
} from '@/features/ventas/utils/measured-line-amount'
import { isMeasuredSaleUnit } from '@/lib/inventory-units'

describe('isMeasuredSaleUnit', () => {
  it('solo KG y MTS', () => {
    expect(isMeasuredSaleUnit('KG')).toBe(true)
    expect(isMeasuredSaleUnit('MTS')).toBe(true)
    expect(isMeasuredSaleUnit('UND')).toBe(false)
    expect(isMeasuredSaleUnit('CAJ')).toBe(false)
  })
})

describe('quantityFromLineAmountUsd', () => {
  it('recalcula kg desde importe (0.05 USD a 0.08/kg → 0.63 kg)', () => {
    // 0.05 / 0.08 = 0.625 → 0.63 con redondeo a 2 decimales
    expect(quantityFromLineAmountUsd(0.05, 0.08, 'KG')).toBe(0.63)
  })

  it('cantidad exacta cuando el importe cuadra', () => {
    expect(quantityFromLineAmountUsd(0.4, 0.08, 'KG')).toBe(5)
  })

  it('null si precio unitario es 0', () => {
    expect(quantityFromLineAmountUsd(1, 0, 'KG')).toBeNull()
  })

  it('null en unidades no medidas', () => {
    expect(quantityFromLineAmountUsd(10, 2, 'UND')).toBeNull()
  })

  it('usa mínimo 0.01 si el importe es positivo pero redondea a 0', () => {
    expect(quantityFromLineAmountUsd(0.0001, 1, 'KG')).toBe(0.01)
  })
})

describe('lineAmountUsdFromQuantity', () => {
  it('qty × precio a 4 decimales', () => {
    expect(lineAmountUsdFromQuantity(0.05, 0.08)).toBe(0.004)
    expect(lineAmountUsdFromQuantity(0.63, 0.08)).toBe(0.0504)
  })
})
