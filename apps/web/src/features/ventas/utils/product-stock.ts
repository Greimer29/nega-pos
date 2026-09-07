import { materialStockDisponible } from '@/features/materials/constants'
import type { Material } from '@/features/materials/types'
import type { CatalogProduct } from '@/features/ventas/types'

export function isProductStockLow(product: CatalogProduct): boolean {
  const stock = Number(product.stock_quantity)
  const minimum = Number(product.minimum_stock ?? 0)
  return stock <= 0 || (minimum > 0 && stock < minimum)
}

export function isMaterialStockLow(material: Material): boolean {
  const { disponible } = materialStockDisponible(material)
  const minimum = Number(material.minimumStock ?? 0)
  return disponible <= 0 || (minimum > 0 && disponible < minimum)
}

export type CartStockLine =
  | { kind?: 'catalog'; product: CatalogProduct; quantity: number }
  | { kind: 'material'; material: Material; quantity: number }

export function cartLineHasStockIssue(line: CartStockLine): boolean {
  if (line.kind === 'material') {
    if (isMaterialStockLow(line.material)) {
      return true
    }
    const { disponible } = materialStockDisponible(line.material)
    return line.quantity > disponible
  }

  if (isProductStockLow(line.product)) {
    return true
  }
  const stock = Number(line.product.stock_quantity)
  return line.quantity > stock
}

export function cartHasStockIssues(lines: CartStockLine[]): boolean {
  return lines.some(cartLineHasStockIssue)
}
