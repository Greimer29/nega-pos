type SaleReturnLineAmount = {
  quantity: number
  returnedQuantity: number
  unitPriceUsd: number
}

type SaleReturnAmountsInput = {
  lines: SaleReturnLineAmount[]
  discountUsd: number | string | null
  totalUsd: number | string | null
  paymentType: 'CASH' | 'CREDIT'
  amountPaidUsd: string
}

export type SaleReturnAmounts = {
  discountUsd: string
  totalUsd: string
  amountPaidUsd: string
  balanceUsd: string
}

export function calculateSaleReturnAmounts(input: SaleReturnAmountsInput): SaleReturnAmounts {
  let remainingGross = 0

  for (const line of input.lines) {
    const activeQty = Number(line.quantity) - Number(line.returnedQuantity ?? 0)
    remainingGross += Math.max(0, activeQty) * Number(line.unitPriceUsd)
  }

  const previousDiscount = Number(input.discountUsd ?? 0)
  const previousTotal = Number(input.totalUsd ?? 0)
  const previousRemainingGross = previousTotal + previousDiscount

  const discountUsd =
    remainingGross <= 0 || previousRemainingGross <= 0
      ? 0
      : Math.min(remainingGross, (previousDiscount * remainingGross) / previousRemainingGross)
  const totalUsd = Math.max(0, remainingGross - discountUsd)
  const formattedTotal = totalUsd.toFixed(4)

  if (input.paymentType === 'CREDIT') {
    const paid = Number(input.amountPaidUsd)
    return {
      discountUsd: discountUsd.toFixed(4),
      totalUsd: formattedTotal,
      amountPaidUsd: input.amountPaidUsd,
      balanceUsd: Math.max(0, totalUsd - paid).toFixed(4),
    }
  }

  return {
    discountUsd: discountUsd.toFixed(4),
    totalUsd: formattedTotal,
    amountPaidUsd: formattedTotal,
    balanceUsd: '0.0000',
  }
}
