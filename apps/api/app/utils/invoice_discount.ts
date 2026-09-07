export function clampInvoiceDiscountUsd(subtotalUsd: number, discountUsd: number): number {
  if (!Number.isFinite(subtotalUsd) || subtotalUsd <= 0) {
    return 0
  }
  if (!Number.isFinite(discountUsd) || discountUsd <= 0) {
    return 0
  }
  return Math.min(discountUsd, subtotalUsd)
}

export function applyInvoiceDiscount(
  subtotalUsd: number,
  discountUsd: number | null | undefined
): { discountUsd: number; totalUsd: number } {
  const subtotal = Math.max(0, Number.isFinite(subtotalUsd) ? subtotalUsd : 0)
  const discount = clampInvoiceDiscountUsd(subtotal, Number(discountUsd) || 0)
  return { discountUsd: discount, totalUsd: subtotal - discount }
}
