import { describe, expect, it } from 'vitest'
import type { AccountStatementMovement } from '@/features/reports/types'
import { computeMovementPeriodTotals } from '@/features/reports/utils/movement-period-totals'

function movement(
  partial: Partial<AccountStatementMovement> & Pick<AccountStatementMovement, 'type'>
): AccountStatementMovement {
  return {
    id: 1,
    date: '2026-06-01',
    label: 'Movimiento',
    account: null,
    amountNative: '0',
    currencyCode: 'USD',
    amountDisplay: '0',
    amountUsd: '0',
    isIncome: false,
    referenceId: 1,
    ...partial,
  }
}

describe('computeMovementPeriodTotals', () => {
  it('sums ventas contado and pending credit separately', () => {
    const totals = computeMovementPeriodTotals(
      [
        movement({ id: 1, type: 'sale', amountUsd: '40.0000', isIncome: true }),
        movement({
          id: 2,
          type: 'sale',
          amountUsd: '60.0000',
          isCreditSale: true,
          creditReportStatus: 'pending',
          creditBalanceUsd: '60.0000',
        }),
        movement({
          id: 3,
          type: 'customer_payment',
          amountUsd: '15.0000',
          isIncome: true,
        }),
      ],
      'ventas'
    )

    expect(totals).toEqual({
      kind: 'credit_split',
      cashUsd: 55,
      pendingCreditUsd: 60,
    })
  })

  it('sums compras contado, supplier payments and pending credit separately', () => {
    const totals = computeMovementPeriodTotals(
      [
        movement({ id: 1, type: 'purchase', amountUsd: '30.0000' }),
        movement({
          id: 2,
          type: 'purchase',
          amountUsd: '45.0000',
          isCreditPurchase: true,
          creditReportStatus: 'overdue',
        }),
        movement({
          id: 3,
          type: 'supplier_payment',
          amountUsd: '20.0000',
        }),
      ],
      'compras'
    )

    expect(totals).toEqual({
      kind: 'credit_split',
      cashUsd: 50,
      pendingCreditUsd: 45,
    })
  })

  it('ignores carryover credit purchases when summing pending credit', () => {
    const totals = computeMovementPeriodTotals(
      [
        movement({
          id: 1,
          type: 'purchase',
          amountUsd: '0.0000',
          isCreditPurchase: true,
          isCreditPurchaseCarryover: true,
          creditReportStatus: 'overdue',
          creditBalanceUsd: '120.0000',
        }),
        movement({
          id: 2,
          type: 'purchase',
          amountUsd: '45.0000',
          isCreditPurchase: true,
          creditReportStatus: 'pending',
        }),
      ],
      'compras'
    )

    expect(totals).toEqual({
      kind: 'credit_split',
      cashUsd: 0,
      pendingCreditUsd: 45,
    })
  })

  it('sums gastos empresa as a single total', () => {
    const totals = computeMovementPeriodTotals(
      [
        movement({ id: 1, type: 'expense', amountUsd: '12.0000' }),
        movement({ id: 2, type: 'expense', amountUsd: '8.0000' }),
      ],
      'gastos'
    )

    expect(totals).toEqual({ kind: 'single', totalUsd: 20 })
  })

  it('sums gastos maquina as a single total', () => {
    const totals = computeMovementPeriodTotals(
      [movement({ id: 1, type: 'machine_expense', amountUsd: '25.0000' })],
      'maquina'
    )

    expect(totals).toEqual({ kind: 'single', totalUsd: 25 })
  })
})
