import { clampInvoiceDiscountUsd } from '#utils/invoice_discount'

function roundMoney4(value: number): number {
  return Math.round(value * 10000) / 10000
}

/**
 * Allocates an invoice-level discount across line gross amounts (largest-remainder on 4 dp).
 * Returns net amounts that sum to grossTotal − discount.
 */
export function allocateInvoiceDiscountToGrossLines(
  grossAmounts: number[],
  discountUsd: number
): number[] {
  if (grossAmounts.length === 0) {
    return []
  }

  const safeGross = grossAmounts.map((value) =>
    Number.isFinite(value) && value > 0 ? value : 0
  )
  const grossTotal = safeGross.reduce((sum, value) => sum + value, 0)
  const discount = clampInvoiceDiscountUsd(grossTotal, discountUsd)

  if (discount <= 0 || grossTotal <= 0) {
    return safeGross.map((value) => roundMoney4(value))
  }

  const targetNet = roundMoney4(grossTotal - discount)
  const rawNets = safeGross.map((gross) => (gross / grossTotal) * targetNet)
  const floors = rawNets.map((net) => Math.floor(net * 10000) / 10000)
  let leftoverUnits = Math.round((targetNet - floors.reduce((sum, value) => sum + value, 0)) * 10000)

  const order = rawNets
    .map((net, index) => ({ index, frac: net * 10000 - Math.floor(net * 10000) }))
    .sort((a, b) => b.frac - a.frac)

  const nets = [...floors]
  for (const item of order) {
    if (leftoverUnits <= 0) break
    nets[item.index] = roundMoney4(nets[item.index]! + 0.0001)
    leftoverUnits -= 1
  }

  return nets
}

export type SaleLineGrossInput = {
  key: string | number
  grossUsd: number
  quantity: number
}

export type SaleLineNetAllocation = {
  key: string | number
  quantity: number
  grossUsd: number
  netUsd: number
}

/** Apply invoice discount to heterogeneous sale lines keyed for aggregation. */
export function allocateInvoiceDiscountToSaleLines(
  lines: SaleLineGrossInput[],
  discountUsd: number
): SaleLineNetAllocation[] {
  const nets = allocateInvoiceDiscountToGrossLines(
    lines.map((line) => line.grossUsd),
    discountUsd
  )

  return lines.map((line, index) => ({
    key: line.key,
    quantity: line.quantity,
    grossUsd: roundMoney4(Math.max(0, line.grossUsd)),
    netUsd: nets[index] ?? 0,
  }))
}
