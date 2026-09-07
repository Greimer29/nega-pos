import { describe, expect, it } from 'vitest'
import { clampInvoiceDiscountUsd, invoiceTotalAfterDiscount } from '@/features/ventas/utils/invoice-discount'

describe('invoice-discount', () => {
  it('clamps discount to the subtotal', () => {
    expect(clampInvoiceDiscountUsd(100, 20)).toBe(20)
    expect(clampInvoiceDiscountUsd(100, 150)).toBe(100)
    expect(clampInvoiceDiscountUsd(100, 0)).toBe(0)
    expect(clampInvoiceDiscountUsd(0, 10)).toBe(0)
  })

  it('computes payable total after discount', () => {
    expect(invoiceTotalAfterDiscount(100, 20)).toBe(80)
    expect(invoiceTotalAfterDiscount(50, 50)).toBe(0)
    expect(invoiceTotalAfterDiscount(50, 80)).toBe(0)
  })
})
