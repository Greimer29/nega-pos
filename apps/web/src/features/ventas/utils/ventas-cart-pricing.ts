import { parseDecimalInput } from '@/lib/numeric-input'

type CartPriceLine = {
  quantity: number
  unitPriceUsd: number
  listPriceUsd?: number
}

export const CART_PERCENT_OFF_OPTIONS = [5, 10, 20] as const

export function cartPriceDecimals(displayCurrency: string) {
  return displayCurrency === 'USD' ? 4 : 6
}

export function cartLineSubtotal(line: CartPriceLine) {
  return line.quantity * line.unitPriceUsd
}

export function cartLineListPrice(line: CartPriceLine) {
  return line.listPriceUsd ?? line.unitPriceUsd
}

export function cartLineHasPriceAdjustment(line: CartPriceLine) {
  return Math.abs(cartLineListPrice(line) - line.unitPriceUsd) > 0.0001
}

/** `discount`: below list price (shown struck through); `markup`: any other edited price. */
export function cartLinePriceAdjustmentKind(line: CartPriceLine): 'discount' | 'markup' | null {
  if (!cartLineHasPriceAdjustment(line)) {
    return null
  }
  return (line.listPriceUsd ?? 0) > line.unitPriceUsd ? 'discount' : 'markup'
}

export function percentOffPriceUsd(listPriceUsd: number, pct: number) {
  return Math.max(0, listPriceUsd * (1 - pct / 100))
}

export function percentOfSubtotalUsd(subtotalUsd: number, pct: number) {
  return Math.max(0, subtotalUsd * (pct / 100))
}

export function usdToPriceDraft(
  amountUsd: number,
  fromUsd: (amountUsd: number) => number,
  decimals: number
) {
  return Number(fromUsd(amountUsd).toFixed(decimals)).toString()
}

export function priceDraftToUsd(
  value: string,
  toUsd: (amount: number) => number,
  decimals: number
) {
  const parsedDisplay = parseDecimalInput(value, decimals) ?? 0
  return Math.max(0, Number(toUsd(parsedDisplay).toFixed(4)))
}
