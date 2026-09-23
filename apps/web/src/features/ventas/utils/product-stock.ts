import { materialStockDisponible } from '@/features/materials/constants'
import { lineInventoryQuantity } from '@/lib/wholesale'
import type { Material } from '@/features/materials/types'
import type { CatalogProduct } from '@/features/ventas/types'

export function isProductStockLow(product: CatalogProduct): boolean {
  if (product.item_kind === 'SERVICE' || product.is_service) {
    return false
  }
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
  | {
      kind?: 'catalog'
      product: CatalogProduct
      quantity: number
      catalogProductSizeId?: number | null
      size?: string | null
      isWholesale?: boolean
    }
  | { kind: 'material'; material: Material; quantity: number; isWholesale?: boolean }

export function cartLineHasStockIssue(line: CartStockLine): boolean {
  if (line.kind === 'material') {
    if (isMaterialStockLow(line.material)) {
      return true
    }
    const { disponible } = materialStockDisponible(line.material)
    const needed = lineInventoryQuantity(
      line.quantity,
      Boolean(line.isWholesale),
      line.material.wholesaleUnitsPerPack
    )
    return needed > disponible
  }

  if (line.product.item_kind === 'SERVICE' || line.product.is_service) {
    return false
  }

  if (line.catalogProductSizeId) {
    const sizeRow = line.product.sizes?.find((s) => Number(s.id) === Number(line.catalogProductSizeId))
    const stock = sizeRow ? Number(sizeRow.stock_quantity) : 0
    if (stock <= 0) return true
    return line.quantity > stock
  }

  if (isProductStockLow(line.product)) {
    return true
  }
  const stock = Number(line.product.stock_quantity)
  const needed = lineInventoryQuantity(
    line.quantity,
    Boolean(line.isWholesale),
    line.product.wholesale_units_per_pack
  )
  return needed > stock
}

export function cartHasStockIssues(lines: CartStockLine[]): boolean {
  return lines.some(cartLineHasStockIssue)
}
