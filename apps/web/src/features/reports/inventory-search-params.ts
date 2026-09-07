import type {
  InventoryMovementsParams,
  InventoryReportParams,
  InventoryReportSortBy,
  InventoryReportSortDir,
} from '@/features/reports/types'

export type InventoryListFilters = {
  search: string
  category: string
  sortBy: InventoryReportSortBy
  sortDir: InventoryReportSortDir
  activeOnly: boolean
  lowStockOnly: boolean
  hideZero: boolean
  page: number
}

export const INVENTORY_SORT_OPTIONS: Array<{
  value: string
  label: string
  sortBy: InventoryReportSortBy
  sortDir: InventoryReportSortDir
}> = [
  { value: 'id:asc', label: 'Código asc', sortBy: 'id', sortDir: 'asc' },
  { value: 'id:desc', label: 'Código desc', sortBy: 'id', sortDir: 'desc' },
  { value: 'name:asc', label: 'Descripción A-Z', sortBy: 'name', sortDir: 'asc' },
  { value: 'name:desc', label: 'Descripción Z-A', sortBy: 'name', sortDir: 'desc' },
  { value: 'sale_price:asc', label: 'Precio menor', sortBy: 'sale_price', sortDir: 'asc' },
  { value: 'sale_price:desc', label: 'Precio mayor', sortBy: 'sale_price', sortDir: 'desc' },
  { value: 'quantity:asc', label: 'Cantidad menor', sortBy: 'quantity', sortDir: 'asc' },
  { value: 'quantity:desc', label: 'Cantidad mayor', sortBy: 'quantity', sortDir: 'desc' },
]

export function defaultInventoryListFilters(): InventoryListFilters {
  return {
    search: '',
    category: '',
    sortBy: 'name',
    sortDir: 'asc',
    activeOnly: true,
    lowStockOnly: false,
    hideZero: false,
    page: 1,
  }
}

export function parseInventoryListFilters(searchParams: URLSearchParams): InventoryListFilters {
  const defaults = defaultInventoryListFilters()
  const sortByRaw = searchParams.get('inv_sort_by')
  const sortDirRaw = searchParams.get('inv_sort_dir')
  const sortBy = (['id', 'name', 'sale_price', 'quantity'] as const).includes(
    sortByRaw as InventoryReportSortBy
  )
    ? (sortByRaw as InventoryReportSortBy)
    : defaults.sortBy
  const sortDir = sortDirRaw === 'desc' || sortDirRaw === 'asc' ? sortDirRaw : defaults.sortDir
  const page = Number(searchParams.get('inv_page') || '1')

  return {
    search: searchParams.get('inv_search')?.trim() ?? '',
    category: searchParams.get('inv_category')?.trim() ?? '',
    sortBy,
    sortDir,
    activeOnly: searchParams.get('inv_active') !== '0',
    lowStockOnly: searchParams.get('inv_low_stock') === '1',
    hideZero: searchParams.get('inv_hide_zero') === '1',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

/** Escribe filtros inv_* y asegura vista=inventario. Conserva otros params no-inv. */
export function applyInventoryListFiltersToSearchParams(
  searchParams: URLSearchParams,
  filters: InventoryListFilters,
  options?: { resetPage?: boolean }
): URLSearchParams {
  const next = new URLSearchParams(searchParams)
  next.set('vista', 'inventario')

  const page = options?.resetPage ? 1 : filters.page

  if (filters.search.trim()) next.set('inv_search', filters.search.trim())
  else next.delete('inv_search')

  if (filters.category.trim()) next.set('inv_category', filters.category.trim())
  else next.delete('inv_category')

  next.set('inv_sort_by', filters.sortBy)
  next.set('inv_sort_dir', filters.sortDir)

  if (filters.activeOnly) next.delete('inv_active')
  else next.set('inv_active', '0')

  if (filters.lowStockOnly) next.set('inv_low_stock', '1')
  else next.delete('inv_low_stock')

  if (filters.hideZero) next.set('inv_hide_zero', '1')
  else next.delete('inv_hide_zero')

  if (page > 1) next.set('inv_page', String(page))
  else next.delete('inv_page')

  return next
}

export function inventoryFiltersToApiParams(
  filters: InventoryListFilters,
  options?: { export?: boolean; perPage?: number }
): InventoryReportParams {
  return {
    search: filters.search.trim() || undefined,
    category: filters.category.trim() || undefined,
    sort_by: filters.sortBy,
    sort_dir: filters.sortDir,
    active: filters.activeOnly ? true : false,
    low_stock: filters.lowStockOnly || undefined,
    hide_zero: filters.hideZero || undefined,
    page: options?.export ? 1 : filters.page,
    per_page: options?.perPage ?? 30,
    export: options?.export || undefined,
  }
}

export function inventoryFiltersSummary(filters: InventoryListFilters): string {
  const parts = ['Inventario global']
  if (filters.activeOnly) parts.push('Solo activos')
  if (filters.lowStockOnly) parts.push('Solo bajo stock')
  if (filters.hideZero) parts.push('Sin stock cero')
  if (filters.category) parts.push(`Categoría: ${filters.category}`)
  if (filters.search) parts.push(`Búsqueda: ${filters.search}`)
  parts.push(`Orden: ${filters.sortBy} ${filters.sortDir}`)
  return parts.join(' · ')
}

export function inventoryListHref(filters: InventoryListFilters): string {
  const params = applyInventoryListFiltersToSearchParams(new URLSearchParams(), filters)
  const qs = params.toString()
  return qs ? `/reportes?${qs}` : '/reportes?vista=inventario'
}

export function inventoryProductHref(
  productId: number,
  searchParams: URLSearchParams
): string {
  const qs = searchParams.toString()
  return qs
    ? `/reportes/inventario/${productId}?${qs}`
    : `/reportes/inventario/${productId}?vista=inventario`
}

export function inventoryMovementsToApiParams(
  period: { month?: string; from?: string; to?: string },
  types: string[] | undefined,
  options?: { page?: number; export?: boolean; perPage?: number }
): InventoryMovementsParams {
  return {
    ...period,
    types: types?.length
      ? (types as InventoryMovementsParams['types'])
      : undefined,
    page: options?.export ? 1 : options?.page ?? 1,
    per_page: options?.perPage ?? 30,
    export: options?.export || undefined,
  }
}
