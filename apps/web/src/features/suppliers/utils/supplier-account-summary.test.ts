import { describe, expect, it } from 'vitest'
import { computeSupplierAccountSummary } from '@/features/suppliers/utils/supplier-account-summary'
import type { SupplierAccountStatement } from '@/features/suppliers/types'

type Purchase = SupplierAccountStatement['purchases'][number]

function purchase(overrides: Partial<Purchase> & Pick<Purchase, 'id'>): Purchase {
  return {
    date: '2026-01-01',
    invoiceNumber: null,
    totalUsd: '0',
    amountPaidUsd: '0',
    balanceUsd: '0',
    creditDueDate: null,
    status: 'CONFIRMED',
    isCredit: false,
    ...overrides,
  }
}

describe('computeSupplierAccountSummary', () => {
  it('excludes draft and voided from comprado amount but counts all operations', () => {
    const summary = computeSupplierAccountSummary(
      [
        purchase({ id: 1, status: 'DRAFT', totalUsd: '100' }),
        purchase({ id: 2, status: 'VOIDED', totalUsd: '50' }),
        purchase({ id: 3, totalUsd: '200', balanceUsd: '0' }),
      ],
      []
    )

    expect(summary.comprado.montoUsd).toBe(200)
    expect(summary.comprado.operacionesTotal).toBe(3)
    expect(summary.comprado.pagadoUsd).toBe(200)
    expect(summary.comprado.creditoSaldoUsd).toBe(0)
  })

  it('treats cash confirmed purchase as fully paid', () => {
    const summary = computeSupplierAccountSummary(
      [purchase({ id: 1, totalUsd: '80', balanceUsd: '0' })],
      []
    )

    expect(summary.pagado.montoUsd).toBe(80)
    expect(summary.pagado.operaciones).toBe(1)
    expect(summary.saldo.montoUsd).toBe(0)
  })

  it('splits credit purchase into pagado and saldo segments', () => {
    const summary = computeSupplierAccountSummary(
      [
        purchase({
          id: 1,
          isCredit: true,
          totalUsd: '100',
          amountPaidUsd: '40',
          balanceUsd: '60',
        }),
      ],
      [{ id: 1, purchaseId: 1, amountUsd: '40', date: '2026-01-02', note: null }]
    )

    expect(summary.comprado.montoUsd).toBe(100)
    expect(summary.comprado.pagadoUsd).toBe(40)
    expect(summary.comprado.creditoSaldoUsd).toBe(60)
    expect(summary.comprado.pagadoUsd + summary.comprado.creditoSaldoUsd).toBe(100)
    expect(summary.pagado.operaciones).toBe(1)
    expect(summary.pagado.porcentajeSobreComprado).toBe(40)
    expect(summary.saldo.porcentajeSobreComprado).toBe(60)
  })

  it('returns zero percentages when there are no confirmed purchases', () => {
    const summary = computeSupplierAccountSummary(
      [purchase({ id: 1, status: 'DRAFT', totalUsd: '50' })],
      []
    )

    expect(summary.comprado.montoUsd).toBe(0)
    expect(summary.pagado.porcentajeSobreComprado).toBe(0)
    expect(summary.saldo.porcentajeSobreComprado).toBe(0)
  })
})
