import type { VentasCatalogSortOption } from '@/features/ventas/components/ventas-catalog-filters-panel'

export type CatalogSource = 'products' | 'materials' | 'services'

export type VentasCatalogFilters = {
  source: CatalogSource
  search: string
  barcode: string
  category: string
  size: string
  sortBy: VentasCatalogSortOption
  minPrice: string
  maxPrice: string
  page: number
}

export const DEFAULT_VENTAS_CATALOG_FILTERS: VentasCatalogFilters = {
  source: 'products',
  search: '',
  barcode: '',
  category: '',
  size: '',
  sortBy: 'most_sold',
  minPrice: '',
  maxPrice: '',
  page: 1,
}

export function defaultSortForSource(source: CatalogSource): VentasCatalogSortOption {
  return source === 'products' ? 'most_sold' : 'name'
}

export function filterCatalogByPrice<T>(
  items: T[],
  minPrice: string,
  maxPrice: string,
  getPrice: (item: T) => number
): T[] {
  const min = Number(minPrice)
  const max = Number(maxPrice)

  return items.filter((item) => {
    const price = getPrice(item)
    if (Number.isFinite(min) && minPrice.trim() && price < min) return false
    if (Number.isFinite(max) && maxPrice.trim() && price > max) return false
    return true
  })
}

export function getCatalogPriceBounds<T>(
  items: T[],
  getPrice: (item: T) => number
): { min: number; max: number } {
  const finite = items.map(getPrice).filter((value) => Number.isFinite(value) && value >= 0)

  if (finite.length === 0) return { min: 0, max: 100 }
  return { min: Math.min(...finite), max: Math.max(...finite) }
}

export function getCatalogSizeOptions(
  products: Array<{ sizes?: Array<{ size: string }> | null }>
): string[] {
  return Array.from(
    new Set(products.flatMap((product) => (product.sizes ?? []).map((size) => size.size)))
  ).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
}
