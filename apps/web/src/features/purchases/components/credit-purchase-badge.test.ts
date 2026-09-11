import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CreditPurchaseBadge } from '@/features/purchases/components/credit-purchase-badge'

describe('CreditPurchaseBadge', () => {
  it('shows Pagada when credit balance is settled', () => {
    const html = renderToStaticMarkup(
      createElement(CreditPurchaseBadge, {
        creditDueDate: '2099-12-31',
        balanceUsd: '0',
        compact: true,
      })
    )
    expect(html).toContain('Pagada')
    expect(html).not.toContain('Por pagar')
    expect(html).not.toContain('Pendiente')
  })

  it('shows Pendiente when credit still has balance and is not due', () => {
    const html = renderToStaticMarkup(
      createElement(CreditPurchaseBadge, {
        creditDueDate: '2099-12-31',
        balanceUsd: '12.5',
        compact: true,
      })
    )
    expect(html).toContain('Pendiente')
    expect(html).not.toContain('vencida')
  })

  it('shows Pendiente vencida when credit still has overdue balance', () => {
    const html = renderToStaticMarkup(
      createElement(CreditPurchaseBadge, {
        creditDueDate: '2020-01-01',
        balanceUsd: '5',
        compact: true,
      })
    )
    expect(html).toContain('Pendiente vencida')
  })

  it('respects reportStatus over due date', () => {
    const html = renderToStaticMarkup(
      createElement(CreditPurchaseBadge, {
        creditDueDate: '2099-12-31',
        balanceUsd: '10',
        reportStatus: 'settled',
        compact: true,
      })
    )
    expect(html).toContain('Pagada')
  })
})
