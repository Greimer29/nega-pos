import {
  creditPurchaseCountsTowardPeriodTotal,
  creditPurchaseVisibleInReport,
} from '#utils/credit_purchase_report'
import { test } from '@japa/runner'

test.group('credit_purchase_report', () => {
  test('creditPurchaseCountsTowardPeriodTotal only in due month', ({ assert }) => {
    const ctx = {
      isCredit: true,
      purchaseDate: '2026-05-10',
      creditDueDate: '2026-06-10',
      balanceUsd: 120,
    }

    assert.isTrue(
      creditPurchaseCountsTowardPeriodTotal(ctx, { from: '2026-06-01', to: '2026-06-30' })
    )
    assert.isFalse(
      creditPurchaseCountsTowardPeriodTotal(ctx, { from: '2026-07-01', to: '2026-07-31' })
    )
  })

  test('creditPurchaseVisibleInReport still shows carryover in later months', ({ assert }) => {
    const ctx = {
      isCredit: true,
      purchaseDate: '2026-05-10',
      creditDueDate: '2026-06-10',
      balanceUsd: 120,
    }

    assert.isTrue(creditPurchaseVisibleInReport(ctx, { from: '2026-06-01', to: '2026-06-30' }))
    assert.isTrue(creditPurchaseVisibleInReport(ctx, { from: '2026-07-01', to: '2026-07-31' }))
  })
})
