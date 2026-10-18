export function calculateProductReturnStockQuantity(
  soldQuantities: Array<number | string>,
  reversedQuantities: Array<number | string>,
  requestedQuantity: number
): number {
  const soldTotal = soldQuantities.reduce<number>(
    (total, quantity) => total + Math.abs(Number(quantity)),
    0
  )
  const reversedTotal = reversedQuantities.reduce<number>(
    (total, quantity) => total + Math.abs(Number(quantity)),
    0
  )

  return Math.max(0, Math.min(requestedQuantity, soldTotal - reversedTotal))
}
