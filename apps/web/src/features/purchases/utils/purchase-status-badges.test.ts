import { describe, expect, it } from 'vitest'
import { resolvePurchaseStatusBadges } from '@/features/purchases/utils/purchase-status-badges'

const today = '2026-09-11'

describe('resolvePurchaseStatusBadges', () => {
  it('marks drafts as yellow borrador', () => {
    expect(
      resolvePurchaseStatusBadges(
        { status: 'DRAFT', isCredit: false, balanceUsd: '0', creditDueDate: null },
        today
      )
    ).toEqual([{ tone: 'draft', label: 'Borrador' }])
  })

  it('marks voided as blue anulada', () => {
    expect(
      resolvePurchaseStatusBadges(
        { status: 'VOIDED', isCredit: true, balanceUsd: '5', creditDueDate: '2026-08-01' },
        today
      )
    ).toEqual([{ tone: 'done', label: 'Anulada' }])
  })

  it('marks cash confirmed as pagada', () => {
    expect(
      resolvePurchaseStatusBadges(
        { status: 'CONFIRMED', isCredit: false, balanceUsd: '0', creditDueDate: null },
        today
      )
    ).toEqual([{ tone: 'done', label: 'Pagada' }])
  })

  it('marks settled credit as pagada even if due date passed', () => {
    expect(
      resolvePurchaseStatusBadges(
        { status: 'CONFIRMED', isCredit: true, balanceUsd: '0', creditDueDate: '2026-08-01' },
        today
      )
    ).toEqual([{ tone: 'done', label: 'Pagada' }])
  })

  it('keeps pending after a partial payment', () => {
    expect(
      resolvePurchaseStatusBadges(
        { status: 'CONFIRMED', isCredit: true, balanceUsd: '5', creditDueDate: '2026-12-01' },
        today
      )
    ).toEqual([{ tone: 'pending', label: 'Pendiente' }])
  })

  it('stacks pendiente and vencida when overdue balance remains', () => {
    expect(
      resolvePurchaseStatusBadges(
        { status: 'CONFIRMED', isCredit: true, balanceUsd: '5', creditDueDate: '2026-08-01' },
        today
      )
    ).toEqual([
      { tone: 'pending', label: 'Pendiente' },
      { tone: 'overdue', label: 'Vencida' },
    ])
  })
})
