import { ArrowLeft, Download, Loader2, Package } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { PublicImage } from '@/components/public-image'
import { Button } from '@/components/ui/button'
import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import { ReportPeriodFilters } from '@/features/reports/components/report-period-filters'
import { useInventoryProductMovementsQuery } from '@/features/reports/hooks/use-reports'
import {
  inventoryListHref,
  inventoryMovementsToApiParams,
  parseInventoryListFilters,
} from '@/features/reports/inventory-search-params'
import {
  applyPeriodToSearchParams,
  parsePeriodFromSearchParams,
  periodLabelFromState,
  periodStateToAccountParams,
} from '@/features/reports/report-period'
import { reportUi } from '@/features/reports/report-ui'
import type { InventoryMovementType } from '@/features/reports/types'
import { exportInventoryMovementsExcel } from '@/features/reports/utils/export-inventory-excel'
import { getInventoryProductMovements } from '@/features/reports/services/report-service'
import { catalogImageUrl } from '@/features/ventas/constants'
import { PRODUCT_MOVIMIENTO_LABELS } from '@/features/ventas/product-inventory-constants'
import { inventoryQuantityDecimals, inventoryUnitAbrev } from '@/lib/inventory-units'
import { notifyApiError, QueryErrorState } from '@/features/notifications/query-error-state'
import { parsePositiveIntRouteParam } from '@/lib/route-id'
import { cn } from '@/lib/utils'

const MOVEMENT_TYPE_GROUPS: Array<{
  id: string
  label: string
  types: InventoryMovementType[]
}> = [
  { id: 'purchase', label: 'Compra', types: ['PURCHASE_IN'] },
  { id: 'sale', label: 'Venta', types: ['SALE_OUT'] },
  {
    id: 'adjustments',
    label: 'Ajustes',
    types: ['MANUAL_ADJUSTMENT', 'MANUAL_CARGO', 'MANUAL_DESCARGO'],
  },
  { id: 'reversal', label: 'Reversión', types: ['REVERSAL_ADJUSTMENT'] },
]

function formatQty(value: string, unit: string) {
  const num = Number(value)
  if (!Number.isFinite(num)) return value
  const decimals = inventoryQuantityDecimals(unit)
  const formatted = Math.abs(num).toLocaleString('es-VE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
  if (num > 0) return `+${formatted}`
  if (num < 0) return `−${formatted}`
  return formatted
}

function formatFechaHora(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-VE', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function InventoryProductMovementsPage() {
  const { productId: productIdParam } = useParams<{ productId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { formatFromUsd } = useDisplayCurrency()
  const { id: productId, isValid } = parsePositiveIntRouteParam(productIdParam)

  const listFilters = useMemo(() => parseInventoryListFilters(searchParams), [searchParams])
  const period = useMemo(() => parsePeriodFromSearchParams(searchParams), [searchParams])
  const page = Math.max(1, Number(searchParams.get('mov_page') || '1') || 1)

  const selectedGroupIds = useMemo(() => {
    const raw = searchParams.get('mov_types')
    if (!raw) return new Set(MOVEMENT_TYPE_GROUPS.map((g) => g.id))
    return new Set(raw.split(',').filter(Boolean))
  }, [searchParams])

  const selectedTypes = useMemo(() => {
    const types = MOVEMENT_TYPE_GROUPS.filter((g) => selectedGroupIds.has(g.id)).flatMap(
      (g) => g.types
    )
    return types.length === MOVEMENT_TYPE_GROUPS.flatMap((g) => g.types).length
      ? undefined
      : types
  }, [selectedGroupIds])

  const queryParams = useMemo(
    () =>
      inventoryMovementsToApiParams(periodStateToAccountParams(period), selectedTypes, {
        page,
        perPage: 30,
      }),
    [period, selectedTypes, page]
  )

  const { data, isLoading, isError, error } = useInventoryProductMovementsQuery(
    productId,
    queryParams,
    { enabled: isValid }
  )

  const [exporting, setExporting] = useState(false)

  const backHref = inventoryListHref(listFilters)

  const handlePeriodChange = useCallback(
    (nextPeriod: typeof period) => {
      const params = applyPeriodToSearchParams(new URLSearchParams(searchParams), nextPeriod)
      params.delete('mov_page')
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  function toggleGroup(groupId: string) {
    const next = new Set(selectedGroupIds)
    if (next.has(groupId)) {
      if (next.size === 1) return
      next.delete(groupId)
    } else {
      next.add(groupId)
    }
    const params = new URLSearchParams(searchParams)
    const allSelected = MOVEMENT_TYPE_GROUPS.every((g) => next.has(g.id))
    if (allSelected) params.delete('mov_types')
    else params.set('mov_types', [...next].join(','))
    params.delete('mov_page')
    setSearchParams(params, { replace: true })
  }

  function setMovPage(nextPage: number) {
    const params = new URLSearchParams(searchParams)
    if (nextPage > 1) params.set('mov_page', String(nextPage))
    else params.delete('mov_page')
    setSearchParams(params, { replace: true })
  }

  async function handleExport() {
    if (!productId) return
    setExporting(true)
    try {
      const result = await getInventoryProductMovements(
        productId,
        inventoryMovementsToApiParams(periodStateToAccountParams(period), selectedTypes, {
          export: true,
        })
      )
      exportInventoryMovementsExcel({
        product: result.product,
        movements: result.movements,
        periodLabel: periodLabelFromState(period),
      })
    } catch (err) {
      notifyApiError(err, 'No se pudo exportar')
    } finally {
      setExporting(false)
    }
  }

  if (!isValid) {
    return <Navigate to={backHref} replace />
  }

  const product = data?.product
  const movements = data?.movements ?? []
  const meta = data?.meta
  const periodLabel = periodLabelFromState(period)

  return (
    <div
      className={cn(
        reportUi.page,
        '-m-4 flex min-h-full flex-col gap-5 p-4 md:-m-6 md:gap-6 md:p-6'
      )}
    >
      <header className="space-y-4">
        <Link
          to={backHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition-colors duration-500 ease-out hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" />
          Volver al inventario
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={reportUi.chip}>Movimientos de inventario</p>
            <h1 className={`${reportUi.title} mt-3`}>
              {product?.description ?? `Producto #${productId}`}
            </h1>
            <p className={`${reportUi.subtitle} mt-2`}>
              Período:{' '}
              <span className="font-medium capitalize text-neutral-800">{periodLabel}</span>
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={reportUi.btnGhost}
            disabled={exporting || isLoading || !product}
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
      </header>

      {product ? (
        <div className={cn(reportUi.panel, 'flex flex-wrap items-center gap-4 p-4 md:p-5')}>
          <div className="size-16 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
            {product.image_path ? (
              <PublicImage
                src={catalogImageUrl(product.product_id)}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <Package className="size-5 text-neutral-300" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium tabular-nums text-neutral-900">{product.code}</p>
            <p className="text-sm text-neutral-700">{product.description}</p>
            <p className={reportUi.muted}>
              Stock {Number(product.total_quantity).toLocaleString('es-VE')}{' '}
              {inventoryUnitAbrev(product.sale_unit)}
              {' · '}
              Precio {formatFromUsd(Number(product.sale_price_usd))}
              {' · '}
              Costo{' '}
              {product.cost_usd != null ? formatFromUsd(Number(product.cost_usd)) : '—'}
              {' · '}
              Origen {product.stock_source === 'formula' ? 'fórmula' : 'manual'}
            </p>
          </div>
        </div>
      ) : null}

      <div className={cn(reportUi.panel, 'space-y-4 p-4 md:p-5')}>
        <div>
          <p className={`mb-3 ${reportUi.muted}`}>Período</p>
          <ReportPeriodFilters value={period} onChange={handlePeriodChange} />
        </div>
        <div>
          <p className={`mb-2 ${reportUi.muted}`}>Tipos de movimiento</p>
          <div className="flex flex-wrap gap-2">
            {MOVEMENT_TYPE_GROUPS.map((group) => {
              const active = selectedGroupIds.has(group.id)
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={cn(active ? reportUi.pillActive : reportUi.pillInactive)}
                >
                  {group.label}
                </button>
              )
            })}
          </div>
        </div>
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
          <QueryErrorState isError error={error} title="No se pudieron cargar los movimientos" />
        </div>
      ) : (
        <>
          <div className={cn(reportUi.panel, 'overflow-hidden')}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-3 py-3 font-medium">Tipo</th>
                    <th className="px-3 py-3 font-medium text-right">Cantidad</th>
                    <th className="px-3 py-3 font-medium">Nota</th>
                    <th className="px-4 py-3 font-medium">Vínculo</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-neutral-500">
                        No hay movimientos en el período seleccionado.
                      </td>
                    </tr>
                  ) : (
                    movements.map((movement) => {
                      const qtyClass =
                        Number(movement.quantity) > 0
                          ? reportUi.income
                          : Number(movement.quantity) < 0
                            ? reportUi.expense
                            : reportUi.value
                      const links: Array<{ label: string; href: string }> = []
                      if (movement.sale_id) {
                        links.push({
                          label: movement.sale_code ?? `Venta #${movement.sale_id}`,
                          href: `/ventas/${movement.sale_id}`,
                        })
                      }
                      if (movement.order_id) {
                        links.push({
                          label: movement.order_code ?? `Pedido #${movement.order_id}`,
                          href: `/ventas/pedidos/${movement.order_id}`,
                        })
                      }
                      if (movement.purchase_id) {
                        links.push({
                          label: `Compra #${movement.purchase_id}`,
                          href: `/purchases/${movement.purchase_id}`,
                        })
                      }

                      return (
                        <tr
                          key={movement.id}
                          className={cn('border-b border-neutral-100', reportUi.rowHover)}
                        >
                          <td className="px-4 py-2.5 tabular-nums text-neutral-700">
                            {formatFechaHora(movement.created_at)}
                          </td>
                          <td className="px-3 py-2.5 text-neutral-800">
                            {PRODUCT_MOVIMIENTO_LABELS[
                              movement.type as keyof typeof PRODUCT_MOVIMIENTO_LABELS
                            ] ?? movement.type}
                          </td>
                          <td className={cn('px-3 py-2.5 text-right tabular-nums', qtyClass)}>
                            {formatQty(
                              movement.quantity,
                              product?.sale_unit ?? 'UND'
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-neutral-600">
                            {movement.note?.trim() || '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            {links.length === 0 ? (
                              <span className="text-neutral-400">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {links.map((link) => (
                                  <Link
                                    key={link.href}
                                    to={link.href}
                                    className="text-sm font-medium text-neutral-800 underline-offset-2 hover:underline"
                                  >
                                    {link.label}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
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
                onClick={() => setMovPage(meta.currentPage - 1)}
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
                onClick={() => setMovPage(meta.currentPage + 1)}
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
