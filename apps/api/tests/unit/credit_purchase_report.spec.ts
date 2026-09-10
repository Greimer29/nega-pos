import {
  creditPurchaseCountsTowardPeriodTotal,
  creditPurchaseReportStatus,
  creditPurchaseVisibleInReport,
} from '#utils/credit_purchase_report'
import { test } from '@japa/runner'

test.group('credit_purchase_report', () => {
  test('creditPurchaseCountsTowardPeriodTotal never counts unpaid credit toward cash', ({
    assert,
  }) => {
    const ctx = {
      isCredit: true,
      purchaseDate: '2026-05-10',
      creditDueDate: '2026-06-10',
      balanceUsd: 120,
    }

    assert.isFalse(
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

  test('creditPurchaseVisibleInReport shows unpaid credit without due date by purchase date', ({
    assert,
  }) => {
    const ctx = {
      isCredit: true,
      purchaseDate: '2026-05-10',
      creditDueDate: null,
      balanceUsd: 80,
    }

    assert.isTrue(creditPurchaseVisibleInReport(ctx, { from: '2026-05-01', to: '2026-05-31' }))
    assert.isTrue(creditPurchaseVisibleInReport(ctx, { from: '2026-06-01', to: '2026-06-30' }))
    assert.isFalse(creditPurchaseVisibleInReport(ctx, { from: '2026-01-01', to: '2026-04-30' }))
  })

  test('creditPurchaseReportStatus treats unpaid without due date as pending', ({ assert }) => {
    assert.equal(
      creditPurchaseReportStatus({
        isCredit: true,
        purchaseDate: '2026-05-10',
        creditDueDate: null,
        balanceUsd: 50,
      }),
      'pending'
    )
  })
})
