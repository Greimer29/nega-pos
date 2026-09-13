import { describe, expect, it } from 'vitest'
import {
  clampInvoiceDiscountUsd,
  invoiceDiscountLabel,
  invoiceDiscountPercent,
  invoiceReturnNetUsd,
  invoiceTotalAfterDiscount,
} from '@/features/ventas/utils/invoice-discount'

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

  it('formats discount percent labels from total + discount', () => {
    expect(invoiceDiscountPercent(24, 6)).toBe(20)
    expect(invoiceDiscountLabel(24, 6)).toBe('Descuento 20%')
    expect(invoiceDiscountLabel(30, 0)).toBeNull()
  })

  it('computes net return amount after invoice discount share', () => {
    expect(invoiceReturnNetUsd(30, 30, 6)).toBe(24)
    expect(invoiceReturnNetUsd(20, 30, 6)).toBe(16)
    expect(invoiceReturnNetUsd(10, 30, 6)).toBe(8)
    expect(invoiceReturnNetUsd(30, 30, 0)).toBe(30)
  })
})
