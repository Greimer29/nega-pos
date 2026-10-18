import {
  freezeFormulaSaleLineCost,
  resolveMaterialSaleLineCost,
  resolveProductSaleLineCost,
} from '#utils/sale_line_cost'
import { test } from '@japa/runner'

test.group('resolveProductSaleLineCost', () => {
  test('uses unit cost for detail sales', ({ assert }) => {
    assert.equal(
      resolveProductSaleLineCost({
        isWholesale: false,
        unitsPerPack: null,
        unitCostUsd: '2.5000',
        wholesaleCostUsd: '14.0000',
      }),
      '2.5000'
    )
  })

  test('prefers configured package cost and otherwise derives it from unit cost', ({ assert }) => {
    assert.equal(
      resolveProductSaleLineCost({
        isWholesale: true,
        unitsPerPack: '6.000',
        unitCostUsd: '2.5000',
        wholesaleCostUsd: '14.0000',
      }),
      '14.0000'
    )
    assert.equal(
      resolveProductSaleLineCost({
        isWholesale: true,
        unitsPerPack: 6,
        unitCostUsd: '2.5000',
        wholesaleCostUsd: null,
      }),
      '15.0000'
    )
  })
})

test.group('resolveMaterialSaleLineCost', () => {
  test('uses last purchase cost for detail and configured package cost for wholesale', ({
    assert,
  }) => {
    assert.equal(
      resolveMaterialSaleLineCost({
        isWholesale: false,
        unitsPerPack: null,
        unitCostUsd: '1.2500',
        wholesaleCostUsd: '7.0000',
      }),
      '1.2500'
    )
    assert.equal(
      resolveMaterialSaleLineCost({
        isWholesale: true,
        unitsPerPack: 6,
        unitCostUsd: '1.2500',
        wholesaleCostUsd: '7.0000',
      }),
      '7.0000'
    )
  })

  test('derives package cost only when a unit purchase cost exists', ({ assert }) => {
    assert.equal(
      resolveMaterialSaleLineCost({
        isWholesale: true,
        unitsPerPack: 6,
        unitCostUsd: '1.2500',
        wholesaleCostUsd: null,
      }),
      '7.5000'
    )
    assert.isNull(
      resolveMaterialSaleLineCost({
        isWholesale: true,
        unitsPerPack: 6,
        unitCostUsd: null,
        wholesaleCostUsd: null,
      })
    )
  })
})

test.group('freezeFormulaSaleLineCost', () => {
  test('freezes formula unit cost at four decimals for detail sales', ({ assert }) => {
    assert.equal(freezeFormulaSaleLineCost(2.34567, false, null), '2.3457')
  })

  test('freezes formula package cost by multiplying unit cost by pack size', ({ assert }) => {
    assert.equal(freezeFormulaSaleLineCost(2.5, true, '6.000'), '15.0000')
  })
})
