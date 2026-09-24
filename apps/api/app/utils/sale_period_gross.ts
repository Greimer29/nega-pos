function roundMoney4(value: number): number {
  return Math.round(value * 10000) / 10000
}

export type SaleGrossLine = {
  unitPriceUsd: number
  costUsd: number | null
  quantity: number
  returnedQuantity: number
}

export type SaleGrossInput = {
  lines: SaleGrossLine[]
  discountUsd: number
  totalUsd: number
  isCredit: boolean
}

export type SaleProductLeft = {
  productLeftUsd: number
  hasLines: boolean
  hasMissingCost: boolean
}

export type PeriodGrossLayers = {
  soldUsd: number
  soldOnCreditUsd: number
  productLeftUsd: number
  salesWithoutLinesCount: number
  salesWithoutCostCount: number
}

function lineNetQuantity(line: SaleGrossLine): number {
  return Math.max(0, (Number(line.quantity) || 0) - (Number(line.returnedQuantity) || 0))
}

/**
 * Margen de una venta: (precio − costo) × unidades netas − descuento de factura.
 * Sin líneas no hay COGS: el bruto queda 0 y el caller lo cuenta aparte.
 */
export function computeSaleProductLeft(sale: SaleGrossInput): SaleProductLeft {
  if (sale.lines.length === 0) {
    return { productLeftUsd: 0, hasLines: false, hasMissingCost: false }
  }

  let left = 0
  let hasMissingCost = false

  for (const line of sale.lines) {
    const qty = lineNetQuantity(line)
    const unitPrice = Number(line.unitPriceUsd) || 0
    const rawCost = line.costUsd
    const cost = rawCost === null || rawCost === undefined ? 0 : Number(rawCost) || 0

    if (rawCost === null || rawCost === undefined || cost === 0) {
      hasMissingCost = true
    }

    left += (unitPrice - cost) * qty
  }

  left -= Math.max(0, Number(sale.discountUsd) || 0)

  return {
    productLeftUsd: roundMoney4(left),
    hasLines: true,
    hasMissingCost,
  }
}

export function accumulatePeriodGross(sales: SaleGrossInput[]): PeriodGrossLayers {
  let soldUsd = 0
  let soldOnCreditUsd = 0
  let productLeftUsd = 0
  let salesWithoutLinesCount = 0
  let salesWithoutCostCount = 0

  for (const sale of sales) {
    const billed = Math.max(0, Number(sale.totalUsd) || 0)
    soldUsd += billed
    if (sale.isCredit) {
      soldOnCreditUsd += billed
    }

    const result = computeSaleProductLeft(sale)
    if (!result.hasLines) {
      if (billed > 0) {
        salesWithoutLinesCount += 1
      }
      continue
    }

    productLeftUsd += result.productLeftUsd
    if (result.hasMissingCost) {
      salesWithoutCostCount += 1
    }
  }

  return {
    soldUsd: roundMoney4(soldUsd),
    soldOnCreditUsd: roundMoney4(soldOnCreditUsd),
    productLeftUsd: roundMoney4(productLeftUsd),
    salesWithoutLinesCount,
    salesWithoutCostCount,
  }
}
