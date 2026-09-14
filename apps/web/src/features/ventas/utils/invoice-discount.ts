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

/** Percent of invoice subtotal represented by discount (0–100). */
export function invoiceDiscountPercent(
  totalUsd: number | string,
  discountUsd: number | string
): number {
  const total = Number(totalUsd)
  const discount = Number(discountUsd)
  if (!Number.isFinite(total) || !Number.isFinite(discount) || discount <= 0) {
    return 0
  }
  const subtotal = total + discount
  if (subtotal <= 0) return 0
  return Math.round((discount / subtotal) * 1000) / 10
}

/** Net refund for returning `returnGross` from an invoice with remaining active gross + discount. */
export function invoiceReturnNetUsd(
  returnGrossUsd: number,
  remainingActiveGrossUsd: number,
  remainingDiscountUsd: number
): number {
  const returnGross = Math.max(0, Number(returnGrossUsd) || 0)
  const activeGross = Math.max(0, Number(remainingActiveGrossUsd) || 0)
  const discount = Math.max(0, Number(remainingDiscountUsd) || 0)
  if (returnGross <= 0) return 0
  if (activeGross <= 0 || discount <= 0) return returnGross
  const share = Math.min(1, returnGross / activeGross)
  const discountShare = Math.min(returnGross, discount * share)
  return Math.max(0, Math.round((returnGross - discountShare) * 10000) / 10000)
}

/** Short label for lists: "Descuento 20%". Empty when no discount. */
export function invoiceDiscountLabel(
  totalUsd: number | string,
  discountUsd: number | string | null | undefined
): string | null {
  const discount = Number(discountUsd ?? 0)
  if (!Number.isFinite(discount) || discount <= 0.0001) {
    return null
  }
  const pct = invoiceDiscountPercent(totalUsd, discount)
  if (pct <= 0) {
    return 'Descuento aplicado'
  }
  const pctText = Number.isInteger(pct) ? String(pct) : pct.toFixed(1)
  return `Descuento ${pctText}%`
}
