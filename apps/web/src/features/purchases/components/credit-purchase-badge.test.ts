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

  it('shows Por pagar when credit still has balance', () => {
    const html = renderToStaticMarkup(
      createElement(CreditPurchaseBadge, {
        creditDueDate: '2099-12-31',
        balanceUsd: '12.5',
        compact: true,
      })
    )
    expect(html).toContain('Por pagar')
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
