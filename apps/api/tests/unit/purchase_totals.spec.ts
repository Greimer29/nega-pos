import { resolvePurchaseTotalUsd } from '#utils/purchase_totals'
import { test } from '@japa/runner'

test.group('resolvePurchaseTotalUsd', () => {
  test('uses the stored base total when present', ({ assert }) => {
    assert.equal(
      resolvePurchaseTotalUsd({ totalUsd: '125.5000', totalBs: '999', usdRate: '40' }),
      125.5
    )
  })

  test('converts total_bs with the document rate when there is no base total', ({ assert }) => {
    assert.equal(
      resolvePurchaseTotalUsd({ totalUsd: null, totalBs: '4000.00', usdRate: '40.0000' }),
      100
    )
  })

  test('counts as zero without base total nor a usable rate', ({ assert }) => {
    assert.equal(resolvePurchaseTotalUsd({ totalUsd: null, totalBs: '4000.00', usdRate: null }), 0)
    assert.equal(resolvePurchaseTotalUsd({ totalUsd: null, totalBs: '4000.00', usdRate: '0' }), 0)
    assert.equal(resolvePurchaseTotalUsd({}), 0)
  })

  test('treats a missing total_bs as zero when converting', ({ assert }) => {
    assert.equal(resolvePurchaseTotalUsd({ totalUsd: null, totalBs: null, usdRate: '40' }), 0)
  })
})
