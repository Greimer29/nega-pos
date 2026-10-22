export type PurchaseTotalSource = {
  totalUsd?: string | number | null
  totalBs?: string | number | null
  usdRate?: string | number | null
}

/**
 * Purchase total in base currency. Older purchases may only store `total_bs`; those are
 * converted with the document rate, and without a usable rate they count as zero.
 */
export function resolvePurchaseTotalUsd(purchase: PurchaseTotalSource): number {
  if (purchase.totalUsd) {
    return Number(purchase.totalUsd)
  }
  const rate = purchase.usdRate ? Number(purchase.usdRate) : null
  if (rate && rate > 0) {
    return Number(purchase.totalBs ?? 0) / rate
  }
  return 0
}
