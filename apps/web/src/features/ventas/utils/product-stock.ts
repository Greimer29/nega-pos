import type { CatalogProduct } from '@/features/ventas/types'

export function isProductStockLow(product: CatalogProduct): boolean {
  const stock = Number(product.stock_quantity)
  const minimum = Number(product.minimum_stock ?? 0)
  return stock <= 0 || (minimum > 0 && stock < minimum)
}

export function cartLineHasStockIssue(line: { product: CatalogProduct; quantity: number }): boolean {
  if (isProductStockLow(line.product)) {
    return true
  }
  const stock = Number(line.product.stock_quantity)
  return line.quantity > stock
}

export function cartHasStockIssues(
  lines: { product: CatalogProduct; quantity: number }[]
): boolean {
  return lines.some(cartLineHasStockIssue)
}
