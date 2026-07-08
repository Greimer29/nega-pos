type OrderLineAmounts = {
  quantity: string
  returned_quantity?: string
  unit_price_usd: string
}

export function orderLineActiveQuantity(line: Pick<OrderLineAmounts, 'quantity' | 'returned_quantity'>) {
  return Math.max(0, Number(line.quantity) - Number(line.returned_quantity ?? 0))
}

export function orderLineNetSubtotalUsd(line: OrderLineAmounts) {
  return orderLineActiveQuantity(line) * Number(line.unit_price_usd)
}

export function catalogLinesNetTotalUsd(lines: OrderLineAmounts[]) {
  return lines.reduce((sum, line) => sum + orderLineNetSubtotalUsd(line), 0)
}
