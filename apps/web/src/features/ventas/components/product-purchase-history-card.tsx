import { CalendarRange, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { FiltersDrawer } from '@/components/filters/filters-drawer'
import { FiltersIconButton } from '@/components/filters/filters-icon-button'
import { FilterSection, FiltersPanel } from '@/components/filters/filters-panel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { productSaleUnitAbrev } from '@/features/ventas/constants'
import { useCatalogProductPurchaseHistoryQuery } from '@/features/ventas/hooks/use-catalog'
import type { CatalogProduct } from '@/features/ventas/types'
import { QueryErrorState } from '@/features/notifications/query-error-state'
import { currentMonthIso, todayIso } from '@/features/reports/constants'
import { formatFecha } from '@/lib/format-date'
import { sessionFilterKey, useSessionPersistedState } from '@/lib/session-persisted-state'

type DateFilter = 'month' | 'custom' | 'all'

type PurchaseHistoryFilters = {
  dateFilter: DateFilter
  month: string
  customFrom: string
  customTo: string
}

const DEFAULT_FILTERS: PurchaseHistoryFilters = {
  dateFilter: 'month',
  month: currentMonthIso(),
  customFrom: '',
  customTo: '',
}

function resolveQueryParams(
  filters: PurchaseHistoryFilters
): Record<string, string> | null {
  if (filters.dateFilter === 'month') {
    if (!filters.month) {
      return null
    }
    return { month: filters.month }
  }
  if (filters.dateFilter === 'custom') {
    if (!filters.customFrom) {
      return null
    }
    return {
      from: filters.customFrom,
      to: filters.customTo || filters.customFrom,
    }
  }
  return {}
}

function activeFilterCount(filters: PurchaseHistoryFilters) {
  if (filters.dateFilter === 'all' || filters.dateFilter === 'custom') {
    return 1
  }
  if (filters.dateFilter === 'month' && filters.month !== currentMonthIso()) {
    return 1
  }
  return 0
}

export function ProductPurchaseHistoryCard({ product }: { product: CatalogProduct }) {
  const { company } = useAuth()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useSessionPersistedState(
    sessionFilterKey(`product-purchase-history-${product.id}`, company?.id),
    { ...DEFAULT_FILTERS, month: currentMonthIso() }
  )
  const queryParams = resolveQueryParams(filters)
  const periodPending = queryParams === null

  const { data, isLoading, isError, error } = useCatalogProductPurchaseHistoryQuery(
    product.id,
    queryParams ?? {},
    { enabled: !periodPending }
  )

  const historial = periodPending ? [] : (data ?? [])
  const unitAbrev = productSaleUnitAbrev(product.sale_unit ?? 'UND')
  const description = periodPending
    ? 'Seleccioná la fecha desde para aplicar el rango personalizado.'
    : isLoading
      ? 'Cargando…'
      : `${historial.length} compra${historial.length === 1 ? '' : 's'} confirmada${historial.length === 1 ? '' : 's'}`

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Compras a proveedores</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <FiltersIconButton
            count={activeFilterCount(filters)}
            expanded={filtersOpen}
            controls="product-purchase-history-filters"
            onClick={() => setFiltersOpen(true)}
          />
        </div>

        <FiltersDrawer
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          id="product-purchase-history-filters"
          title="Filtros de compras"
          description="Período de las compras confirmadas de este producto."
        >
          <FiltersPanel
            onClearAll={() =>
              setFilters({
                dateFilter: 'month',
                month: currentMonthIso(),
                customFrom: '',
                customTo: '',
              })
            }
          >
            <FilterSection
              title="Período"
              icon={<CalendarRange className="size-4 text-neutral-500" />}
            >
              <div className="space-y-3">
                <select
                  className="border-input flex h-9 w-full rounded-md border bg-white px-3 text-sm"
                  value={filters.dateFilter}
                  onChange={(e) => {
                    const dateFilter = e.target.value as DateFilter
                    setFilters((prev) => ({
                      ...prev,
                      dateFilter,
                      month: dateFilter === 'month' ? prev.month || currentMonthIso() : prev.month,
                      customFrom:
                        dateFilter === 'custom' ? prev.customFrom || todayIso() : prev.customFrom,
                      customTo:
                        dateFilter === 'custom' ? prev.customTo || todayIso() : prev.customTo,
                    }))
                  }}
                >
                  <option value="month">Por mes</option>
                  <option value="custom">Rango de fechas</option>
                  <option value="all">Todas</option>
                </select>
                {filters.dateFilter === 'month' ? (
                  <Input
                    type="month"
                    value={filters.month}
                    onChange={(e) => {
                      setFilters((prev) => ({
                        ...prev,
                        month: e.target.value,
                      }))
                    }}
                  />
                ) : null}
                {filters.dateFilter === 'custom' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={filters.customFrom}
                      onChange={(e) => {
                        setFilters((prev) => ({
                          ...prev,
                          customFrom: e.target.value,
                        }))
                      }}
                    />
                    <Input
                      type="date"
                      value={filters.customTo}
                      onChange={(e) => {
                        setFilters((prev) => ({
                          ...prev,
                          customTo: e.target.value,
                        }))
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </FilterSection>
          </FiltersPanel>
        </FiltersDrawer>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Cargando compras…
          </div>
        ) : periodPending ? (
          <p className="text-muted-foreground text-sm">
            Seleccioná la fecha desde para aplicar el rango personalizado.
          </p>
        ) : isError ? (
          <QueryErrorState
            isError={isError}
            error={error}
            title="No se pudo cargar las compras"
            fallbackLabel="No se pudo cargar el historial de compras."
          />
        ) : historial.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Sin compras confirmadas en el período seleccionado.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b text-left">
                  <th className="px-4 py-3 font-medium">Código proveedor</th>
                  <th className="px-4 py-3 font-medium">Proveedor</th>
                  <th className="px-4 py-3 font-medium">Cantidad</th>
                  <th className="px-4 py-3 font-medium">Precio costo</th>
                  <th className="px-4 py-3 font-medium">Subtotal</th>
                  <th className="px-4 py-3 font-medium">Fecha de compra</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((row) => (
                  <tr key={row.purchaseItemId} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium tabular-nums">
                      {row.supplier.code?.trim() || '—'}
                    </td>
                    <td className="px-4 py-3">{row.supplier.name}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {Number(row.quantity).toLocaleString('es-VE')} {unitAbrev}
                    </td>
                    <td className="px-4 py-3">
                      <DisplayMoneyFromUsd amountUsd={row.unitPriceUsd} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <DisplayMoneyFromUsd amountUsd={row.subtotalUsd} size="sm" />
                    </td>
                    <td className="text-muted-foreground px-4 py-3">{formatFecha(row.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
