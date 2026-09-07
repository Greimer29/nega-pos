import type { CatalogProduct, CatalogProductSize } from '@/features/ventas/types'
import { formatInventoryQuantity } from '@/lib/inventory-units'

export function productHasSizes(product: CatalogProduct): boolean {
  return Boolean(product.has_sizes) || (product.sizes?.length ?? 0) > 0
}

export function sizesWithStock(product: CatalogProduct): CatalogProductSize[] {
  return (product.sizes ?? []).filter((size) => Number(size.stock_quantity) > 0)
}

export function formatSizeStockSummary(product: CatalogProduct): string {
  const sizes = product.sizes ?? []
  if (sizes.length === 0) return ''
  const unit = product.sale_unit ?? 'UND'
  return sizes
    .map((size) => `${size.size}×${formatInventoryQuantity(size.stock_quantity, unit)}`)
    .join(' · ')
}

export function cartSizeKey(productId: number, sizeId: number | null | undefined): string {
  return `${productId}:${sizeId ?? 'nosize'}`
}
