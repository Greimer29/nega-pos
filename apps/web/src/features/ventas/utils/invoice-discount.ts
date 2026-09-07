export function clampInvoiceDiscountUsd(subtotalUsd: number, discountUsd: number): number {
  if (!Number.isFinite(subtotalUsd) || subtotalUsd <= 0) {
    return 0
  }
  if (!Number.isFinite(discountUsd) || discountUsd <= 0) {
    return 0
  }
  return Math.min(discountUsd, subtotalUsd)
}

export function invoiceTotalAfterDiscount(subtotalUsd: number, discountUsd: number): number {
  return Math.max(0, subtotalUsd - clampInvoiceDiscountUsd(subtotalUsd, discountUsd))
}
