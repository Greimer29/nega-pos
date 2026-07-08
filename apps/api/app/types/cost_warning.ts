export type CostWarning = {
  product_id: number
  product_name: string
  sale_price_usd: string
  cost_usd: string
}

export function serializeCostWarning(warning: CostWarning) {
  return {
    product_id: warning.product_id,
    product_name: warning.product_name,
    sale_price_usd: warning.sale_price_usd,
    cost_usd: warning.cost_usd,
  }
}
