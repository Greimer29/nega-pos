export type SaleLineAmounts = {
  subtotal: number
  unitPriceUsd: string
  subtotalUsd: string
}

export function calculateSaleLineAmounts(quantity: number, unitPriceUsd: number): SaleLineAmounts {
  const subtotal = quantity * unitPriceUsd

  return {
    subtotal,
    unitPriceUsd: unitPriceUsd.toFixed(4),
    subtotalUsd: subtotal.toFixed(4),
  }
}

export function normalizeSaleLineKitchenNote(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
