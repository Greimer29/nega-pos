import { Download, Loader2, Package, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PublicImage } from '@/components/public-image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useActiveCategoriesQuery } from '@/features/categories/hooks/use-categories'
import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import { useInventoryReportQuery } from '@/features/reports/hooks/use-reports'
import {
  INVENTORY_SORT_OPTIONS,
  applyInventoryListFiltersToSearchParams,
  defaultInventoryListFilters,
  inventoryFiltersSummary,
  inventoryFiltersToApiParams,
  inventoryProductHref,
  parseInventoryListFilters,
  type InventoryListFilters,
} from '@/features/reports/inventory-search-params'
import { reportUi } from '@/features/reports/report-ui'
import type { InventoryReportProduct } from '@/features/reports/types'
import { exportInventoryReportExcel } from '@/features/reports/utils/export-inventory-excel'
import { getInventoryReport } from '@/features/reports/services/report-service'
import { materialImageUrl } from '@/features/materials/constants'
import { catalogImageUrl } from '@/features/ventas/constants'
import { inventoryQuantityDecimals, inventoryUnitAbrev } from '@/lib/inventory-units'
import { notifyApiError, QueryErrorState } from '@/features/notifications/query-error-state'
import {
  hydrateSessionValue,
  sessionFilterKey,
  writeSessionJson,
} from '@/lib/session-persisted-state'
import { cn } from '@/lib/utils'

function hasInventoryFilterParams(searchParams: URLSearchParams): boolean {
  return [...searchParams.keys()].some((key) => key.startsWith('inv_'))
}

function formatQty(value: string, unit: string) {
  const num = Number(value)
  if (!Number.isFinite(num)) return value
  const decimals = inventoryQuantityDecimals(unit)
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}

function productImageSrc(product: InventoryReportProduct) {
  if (!product.image_path) return null
  return product.kind === 'material'
    ? materialImageUrl(product.product_id)
    : catalogImageUrl(product.product_id)
}

export function InventoryReportPanel() {
  const navigate = useNavigate()
  const { company } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const { formatFromUsd } = useDisplayCurrency()
  const { data: categories = [] } = useActiveCategoriesQuery()
  const storageKey = sessionFilterKey('reports-inventory', company?.id)
  const sessionHydratedRef = useRef(false)

  const filters = useMemo(() => parseInventoryListFilters(searchParams), [searchParams])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [searchInput, setSearchInput] = useState(filters.search)
  const [exporting, setExporting] = useState(false)

  // Restore from session when landing without inv_* (e.g. hub tab switch cleared URL).
  useEffect(() => {
    if (sessionHydratedRef.current) return
    sessionHydratedRef.current = true

    if (hasInventoryFilterParams(searchParams)) {
      writeSessionJson(storageKey, parseInventoryListFilters(searchParams))
      return
    }

    const stored = hydrateSessionValue(storageKey, defaultInventoryListFilters())
    const defaults = defaultInventoryListFilters()
    const unchanged =
      stored.search === defaults.search &&
      stored.category === defaults.category &&
      stored.sortBy === defaults.sortBy &&
      stored.sortDir === defaults.sortDir &&
      stored.activeOnly === defaults.activeOnly &&
      stored.lowStockOnly === defaults.lowStockOnly &&
      stored.hideZero === defaults.hideZero &&
      stored.page === defaults.page
    if (unchanged) return

    setSearchParams(
      applyInventoryListFiltersToSearchParams(searchParams, stored, { resetPage: false }),
      { replace: true }
    )
  }, [searchParams, setSearchParams, storageKey])

  useEffect(() => {
    if (!hasInventoryFilterParams(searchParams) && !sessionHydratedRef.current) return
    writeSessionJson(storageKey, filters)
  }, [filters, searchParams, storageKey])

  useEffect(() => {
    setSearchInput(filters.search)
  }, [filters.search])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = searchInput.trim()
      if (trimmed === filters.search) return
      const nextFilters: InventoryListFilters = { ...filters, search: trimmed }
      const next = applyInventoryListFiltersToSearchParams(searchParams, nextFilters, {
        resetPage: true,
      })
      setSearchParams(next, { replace: true })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput, filters, searchParams, setSearchParams])

  const apiParams = useMemo(() => inventoryFiltersToApiParams(filters), [filters])
  const { data, isLoading, isError, error } = useInventoryReportQuery(apiParams)

  function patchFilters(
    patch: Partial<InventoryListFilters>,
    options?: { resetPage?: boolean }
  ) {
    const nextFilters: InventoryListFilters = {
      ...filters,
      ...patch,
    }
    const next = applyInventoryListFiltersToSearchParams(searchParams, nextFilters, {
      resetPage: options?.resetPage ?? true,
    })
    setSearchParams(next, { replace: true })
  }

  function setPage(page: number) {
    const next = applyInventoryListFiltersToSearchParams(
      searchParams,
      { ...filters, page },
      { resetPage: false }
    )
    setSearchParams(next, { replace: true })
  }

  async function handleExport() {
    setExporting(true)
    try {
      const result = await getInventoryReport(
        inventoryFiltersToApiParams(filters, { export: true })
      )
      exportInventoryReportExcel({
        products: result.products,
        filtersSummary: inventoryFiltersSummary(filters),
        formatMoney: (amountUsd) => formatFromUsd(amountUsd),
      })
    } catch (err) {
      notifyApiError(err, 'No se pudo exportar')
    } finally {
      setExporting(false)
    }
  }

  function openItem(product: InventoryReportProduct) {
    if (product.kind === 'material') {
      void navigate(`/productos/materiales/${product.product_id}`)
      return
    }
    void navigate(inventoryProductHref(product.product_id, searchParams))
  }

  const products = data?.products ?? []
  const meta = data?.meta
  const sortValue = `${filters.sortBy}:${filters.sortDir}`

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={reportUi.sectionTitle}>Stock actual de productos y materiales</h2>
          <p className={`${reportUi.muted} mt-1`}>
            {meta
              ? `${meta.total} ítem${meta.total === 1 ? '' : 's'} · Página ${meta.currentPage} de ${meta.lastPage}`
              : '—'}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={reportUi.btnGhost}
          disabled={exporting || isLoading}
          onClick={() => void handleExport()}
        >
          {exporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Exportar Excel
        </Button>
      </div>

      <div className={cn(reportUi.panel, 'p-4 md:p-5')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar código, descripción, marca…"
            className={cn(reportUi.input, 'max-w-sm')}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={reportUi.btnGhost}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <SlidersHorizontal className="size-4" />
            Filtros
          </Button>
        </div>

        {filtersOpen ? (
          <div className={cn('mt-4 grid gap-4 border-t pt-4 md:grid-cols-2 lg:grid-cols-3', reportUi.divider)}>
            <label className="space-y-1.5 text-sm">
              <span className={reportUi.muted}>Categoría</span>
              <select
                className={cn(reportUi.input, 'w-full px-3')}
                value={filters.category}
                onChange={(e) => patchFilters({ category: e.target.value })}
              >
                <option value="">Todas</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 text-sm">
              <span className={reportUi.muted}>Ordenar</span>
              <select
                className={cn(reportUi.input, 'w-full px-3')}
                value={sortValue}
                onChange={(e) => {
                  const option = INVENTORY_SORT_OPTIONS.find((o) => o.value === e.target.value)
                  if (!option) return
                  patchFilters({ sortBy: option.sortBy, sortDir: option.sortDir })
                }}
              >
                {INVENTORY_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col justify-end gap-2 pb-1 text-sm text-neutral-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-neutral-900"
                  checked={filters.activeOnly}
                  onChange={(e) => patchFilters({ activeOnly: e.target.checked })}
                />
                Solo activos
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-neutral-900"
                  checked={filters.lowStockOnly}
                  onChange={(e) => patchFilters({ lowStockOnly: e.target.checked })}
                />
                Solo bajo stock
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-neutral-900"
                  checked={filters.hideZero}
                  onChange={(e) => patchFilters({ hideZero: e.target.checked })}
                />
                Ocultar tallas sin stock
              </label>
            </div>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div
          className={`${reportUi.panel} flex items-center justify-center gap-2 py-20 text-sm text-neutral-400`}
        >
          <Loader2 className="size-4 animate-spin" />
          Cargando inventario…
        </div>
      ) : isError ? (
        <div className={reportUi.panel}>
          <QueryErrorState isError error={error} title="No se pudo cargar el inventario" />
        </div>
      ) : products.length === 0 ? (
        <div className={`${reportUi.panel} flex flex-col items-center gap-3 px-5 py-16 text-center`}>
          <Package className="size-10 text-neutral-300" />
          <p className={reportUi.body}>
            No hay productos ni materiales que coincidan con los filtros.
          </p>
        </div>
      ) : (
        <>
          <div className={cn(reportUi.panel, 'overflow-hidden')}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                    <th className="px-4 py-3 font-medium">Código / Imagen</th>
                    <th className="px-3 py-3 font-medium">Tipo</th>
                    <th className="px-3 py-3 font-medium">Descripción</th>
                    <th className="px-3 py-3 font-medium">Talla</th>
                    <th className="px-3 py-3 font-medium text-right">Cantidad</th>
                    <th className="px-3 py-3 font-medium">Unidad</th>
                    <th className="px-3 py-3 font-medium text-right">Precio</th>
                    <th className="px-4 py-3 font-medium text-right">Costo</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const lines =
                      product.lines.length > 0
                        ? product.lines
                        : [{ size: null, quantity: product.total_quantity }]
                    const imageSrc = productImageSrc(product)
                    const kindLabel = product.kind === 'material' ? 'Material' : 'Producto'

                    return lines.map((line, index) => {
                      const isFirst = index === 0
                      return (
                        <tr
                          key={`${product.kind ?? 'product'}-${product.product_id}-${index}`}
                          className={cn(
                            'cursor-pointer border-b border-neutral-100',
                            reportUi.rowHover,
                            product.low_stock && 'bg-red-50/70 hover:bg-red-50'
                          )}
                          onClick={() => openItem(product)}
                        >
                          <td className="px-4 py-2.5 align-middle">
                            {isFirst ? (
                              <div className="flex items-center gap-3">
                                <div className="size-10 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                                  {imageSrc ? (
                                    <PublicImage
                                      src={imageSrc}
                                      alt=""
                                      className="size-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex size-full items-center justify-center">
                                      <Package className="size-4 text-neutral-300" />
                                    </div>
                                  )}
                                </div>
                                <span className="font-medium tabular-nums text-neutral-900">
                                  {product.code}
                                </span>
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5 align-middle text-neutral-600">
                            {isFirst ? kindLabel : null}
                          </td>
                          <td className="px-3 py-2.5 align-middle text-neutral-900">
                            {isFirst ? product.description : null}
                          </td>
                          <td className="px-3 py-2.5 align-middle text-neutral-700">
                            {line.size?.trim() ? line.size : '—'}
                          </td>
                          <td className="px-3 py-2.5 align-middle text-right tabular-nums text-neutral-900">
                            {formatQty(line.quantity, product.sale_unit)}
                          </td>
                          <td className="px-3 py-2.5 align-middle text-neutral-600">
                            {inventoryUnitAbrev(product.sale_unit)}
                          </td>
                          <td className="px-3 py-2.5 align-middle text-right tabular-nums text-neutral-900">
                            {isFirst ? formatFromUsd(Number(product.sale_price_usd)) : null}
                          </td>
                          <td className="px-4 py-2.5 align-middle text-right tabular-nums text-neutral-700">
                            {isFirst
                              ? product.cost_usd != null
                                ? formatFromUsd(Number(product.cost_usd))
                                : '—'
                              : null}
                          </td>
                        </tr>
                      )
                    })
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {meta && meta.lastPage > 1 ? (
            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={reportUi.btnGhost}
                disabled={meta.currentPage <= 1}
                onClick={() => setPage(meta.currentPage - 1)}
              >
                Anterior
              </Button>
              <span className={reportUi.muted}>
                Página {meta.currentPage} de {meta.lastPage}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={reportUi.btnGhost}
                disabled={meta.currentPage >= meta.lastPage}
                onClick={() => setPage(meta.currentPage + 1)}
              >
                Siguiente
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
