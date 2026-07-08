import { describe, expect, it } from 'vitest'
import { computeCustomerAccountSummary } from '@/features/customers/utils/customer-account-summary'
import type { CustomerAccountStatement } from '@/features/customers/types'

type Sale = CustomerAccountStatement['sales'][number]

function sale(overrides: Partial<Sale> & Pick<Sale, 'id' | 'code'>): Sale {
  return {
    status: 'COMPLETED',
    billingMode: 'FAST',
    orderStatus: 'DELIVERED',
    paymentType: 'CASH',
    soldAt: '2026-01-01T12:00:00.000Z',
    confirmedAt: '2026-01-01T12:00:00.000Z',
    totalUsd: '0',
    amountPaidUsd: '0',
    balanceUsd: '0',
    creditDueDate: null,
    guestName: null,
    ...overrides,
  }
}

describe('computeCustomerAccountSummary', () => {
  it('excludes draft from facturado amount but counts all operations', () => {
    const summary = computeCustomerAccountSummary(
      [
        sale({ id: 1, code: null, status: 'DRAFT', totalUsd: '100' }),
        sale({ id: 2, code: '0000000002', totalUsd: '200', balanceUsd: '0' }),
      ],
      []
    )

    expect(summary.facturado.montoUsd).toBe(200)
    expect(summary.facturado.operacionesTotal).toBe(2)
    expect(summary.facturado.pagadoUsd).toBe(200)
    expect(summary.facturado.creditoSaldoUsd).toBe(0)
  })

  it('treats cash billable sale as fully paid', () => {
    const summary = computeCustomerAccountSummary(
      [sale({ id: 1, code: '0000000001', totalUsd: '80', balanceUsd: '0' })],
      []
    )

    expect(summary.abonado.montoUsd).toBe(80)
    expect(summary.abonado.operaciones).toBe(1)
    expect(summary.pendiente.montoUsd).toBe(0)
  })

  it('splits credit sale into abonado and pendiente segments', () => {
    const summary = computeCustomerAccountSummary(
      [
        sale({
          id: 1,
          code: '0000000001',
          paymentType: 'CREDIT',
          totalUsd: '100',
          amountPaidUsd: '40',
          balanceUsd: '60',
        }),
      ],
      [{ id: 1, saleId: 1, orderId: null, amountUsd: '40', date: '2026-01-02', note: null }]
    )

    expect(summary.facturado.montoUsd).toBe(100)
    expect(summary.facturado.pagadoUsd).toBe(40)
    expect(summary.facturado.creditoSaldoUsd).toBe(60)
    expect(summary.facturado.pagadoUsd + summary.facturado.creditoSaldoUsd).toBe(100)
    expect(summary.abonado.operaciones).toBe(1)
    expect(summary.abonado.porcentajeSobreFacturado).toBe(40)
    expect(summary.pendiente.porcentajeSobreFacturado).toBe(60)
  })

  it('returns zero percentages when there are no billable sales', () => {
    const summary = computeCustomerAccountSummary(
      [sale({ id: 1, code: null, status: 'DRAFT', totalUsd: '50' })],
      []
    )

    expect(summary.facturado.montoUsd).toBe(0)
    expect(summary.abonado.porcentajeSobreFacturado).toBe(0)
    expect(summary.pendiente.porcentajeSobreFacturado).toBe(0)
  })
})
