export type SaleReturnLineInput = {
  line_id: number
  quantity: number
}

type SaleReturnLine = {
  id: number | string | bigint
  quantity: number | string
  returnedQuantity: number | string | null
}

export function resolveSaleReturnRequests(
  lines: SaleReturnLine[],
  input?: SaleReturnLineInput[]
): { lineId: number; quantity: number }[] {
  if (!input || input.length === 0) {
    return lines
      .map((line) => {
        const remaining = Number(line.quantity) - Number(line.returnedQuantity ?? 0)
        return remaining > 0 ? { lineId: Number(line.id), quantity: remaining } : null
      })
      .filter((item): item is { lineId: number; quantity: number } => item !== null)
  }

  return input.map((item) => ({
    lineId: item.line_id,
    quantity: item.quantity,
  }))
}
