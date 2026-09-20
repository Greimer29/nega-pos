function roundMoney4(value: number): number {
  return Math.round(value * 10000) / 10000
}

export type SaleLineQtyPrice = {
  quantity: number
  returnedQuantity: number
  unitPriceUsd: number
}

export type SaleOriginalReturnedNet = {
  originalNetUsd: number
  remainingNetUsd: number
  returnedNetUsd: number
}

/**
 * Reconstruct billed original vs remaining after returns.
 * After a full return `sales.total_usd` is 0 and the proportional discount is wiped,
 * so original net falls back to payment snapshots (cash) or line gross.
 */
export function computeSaleOriginalReturnedNet(input: {
  lines: SaleLineQtyPrice[]
  remainingTotalUsd: number
  remainingDiscountUsd: number
  originalPaymentsUsd?: number
}): SaleOriginalReturnedNet {
  let originalGross = 0
  let remainingGross = 0

  for (const line of input.lines) {
    const quantity = Number(line.quantity) || 0
    const returnedQuantity = Math.max(0, Number(line.returnedQuantity) || 0)
    const unitPrice = Number(line.unitPriceUsd) || 0
    originalGross += quantity * unitPrice
    remainingGross += Math.max(0, quantity - returnedQuantity) * unitPrice
  }

  originalGross = roundMoney4(Math.max(0, originalGross))
  remainingGross = roundMoney4(Math.max(0, remainingGross))
  const remainingNet = roundMoney4(Math.max(0, Number(input.remainingTotalUsd) || 0))
  const remainingDiscount = roundMoney4(Math.max(0, Number(input.remainingDiscountUsd) || 0))
  const paymentsUsd = roundMoney4(Math.max(0, Number(input.originalPaymentsUsd) || 0))

  let originalNet: number
  if (remainingGross > 0.00005) {
    const originalDiscount =
      remainingDiscount <= 0 || remainingGross <= 0
        ? 0
        : Math.min(originalGross, (remainingDiscount * originalGross) / remainingGross)
    originalNet = roundMoney4(Math.max(0, originalGross - originalDiscount))
  } else if (paymentsUsd > 0.00005) {
    originalNet = paymentsUsd
  } else {
    originalNet = originalGross
  }

  const returnedNet = roundMoney4(Math.max(0, originalNet - remainingNet))

  return {
    originalNetUsd: originalNet,
    remainingNetUsd: remainingNet,
    returnedNetUsd: returnedNet,
  }
}
