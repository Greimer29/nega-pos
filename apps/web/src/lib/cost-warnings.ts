export type CostWarning = {
  product_id: number
  product_name: string
  sale_price_usd: string
  cost_usd: string
}

export function formatCostWarningsMessage(warnings: CostWarning[]): string | null {
  if (warnings.length === 0) {
    return null
  }

  const lines = warnings.map(
    (warning) =>
      `«${warning.product_name}»: precio venta $${Number(warning.sale_price_usd).toFixed(2)} < costo $${Number(warning.cost_usd).toFixed(2)}`
  )

  if (warnings.length === 1) {
    return `El producto quedó por debajo del costo. ${lines[0]}.`
  }

  return `${warnings.length} productos quedaron por debajo del costo:\n${lines.join('\n')}`
}

export function isBelowCost(salePriceUsd: string | number, costUsd: string | number): boolean {
  const sale = Number(salePriceUsd)
  const cost = Number(costUsd)
  return sale > 0 && cost > 0 && sale < cost
}
