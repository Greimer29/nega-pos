import { ChevronDown, Loader2, RotateCcw, Search } from 'lucide-react'
import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { VentasHistoryOrderLines } from '@/features/ventas/components/ventas-history-order-lines'
import { VentasOrderReturnDialog } from '@/features/ventas/components/ventas-order-return-dialog'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { useSalesQuery } from '@/features/ventas/hooks/use-sales'
import { SALE_ORDER_STATUS_LABELS, paymentMethodLabel } from '@/features/ventas/constants'
import type { SaleOrderStatus } from '@/features/ventas/types'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

const PER_PAGE = 20

type DateFilter = 'today' | 'month' | 'custom' | 'all'

function startOfMonthIso() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function resolveDateRange(
  filter: DateFilter,
  customFrom: string,
  customTo: string
): Record<string, string> | null {
  if (filter === 'today') {
    const today = todayIso()
    return { date_from: today, date_to: today }
  }
  if (filter === 'month') {
    return { date_from: startOfMonthIso(), date_to: todayIso() }
  }
  if (filter === 'custom') {
    if (!customFrom) {
      return null
    }
    return { date_from: customFrom, date_to: customTo || customFrom }
  }
  return {}
}

function formatSaleDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('es-VE')
}

function SaleStatusBadge({
  billingMode,
  orderStatus,
  status,
}: {
  billingMode: string
  orderStatus: SaleOrderStatus
  status: string
}) {
  if (status === 'RETURNED') {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
        Devuelta
      </span>
    )
  }

  if (billingMode === 'ORDER') {
    return (
      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-900">
        Pedido · {SALE_ORDER_STATUS_LABELS[orderStatus]}
      </span>
    )
  }

  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
      Entregada
    </span>
  )
}

export function VentasHistoryPanel() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [returnSaleId, setReturnSaleId] = useState<number | null>(null)
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const dateRange = resolveDateRange(dateFilter, customFrom, customTo)
  const customRangePending = dateFilter === 'custom' && dateRange === null

  const { data, isLoading, isError, error, refetch } = useSalesQuery(
    {
      page,
      perPage: PER_PAGE,
      search: debouncedSearch || undefined,
      exclude_status: 'DRAFT',
      ...(dateRange ?? {}),
    },
    { enabled: !customRangePending }
  )

  const sales = customRangePending ? [] : (data?.sales ?? [])
  const meta = customRangePending ? undefined : data?.meta

  const historyDescription = customRangePending
    ? 'Seleccioná la fecha desde para aplicar el rango personalizado.'
    : meta
      ? `${meta.total} venta${meta.total === 1 ? '' : 's'}`
      : isLoading
        ? 'Cargando…'
        : 'Sin resultados'

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <p className="text-muted-foreground shrink-0 text-sm">
        Consultá facturas confirmadas, abrí el detalle y registrá devoluciones.
      </p>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CardHeader className="shrink-0 gap-4">
          <div>
            <CardTitle className="text-base">Historial de ventas</CardTitle>
            <CardDescription>{historyDescription}</CardDescription>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                className="pl-9"
                placeholder="Código, cliente, producto…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <select
              className="border-input flex h-9 rounded-md border bg-white px-3 text-sm"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value as DateFilter)
                setPage(1)
              }}
            >
              <option value="today">Hoy</option>
              <option value="month">Este mes</option>
              <option value="all">Todas</option>
              <option value="custom">Rango personalizado</option>
            </select>

            {dateFilter === 'custom' ? (
              <>
                <Input
                  type="date"
                  className="w-auto"
                  value={customFrom}
                  onChange={(e) => {
                    setCustomFrom(e.target.value)
                    setPage(1)
                  }}
                />
                <Input
                  type="date"
                  className="w-auto"
                  value={customTo}
                  onChange={(e) => {
                    setCustomTo(e.target.value)
                    setPage(1)
                  }}
                />
              </>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          {isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Cargando ventas…
            </div>
          ) : customRangePending ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              Seleccioná la fecha desde para aplicar el rango personalizado.
            </p>
          ) : isError ? (
            <p className="text-destructive py-8 text-center text-sm whitespace-pre-line">
              {getApiErrorMessage(error)}
            </p>
          ) : sales.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              No hay ventas que coincidan con los filtros.
            </p>
          ) : (
            <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-md border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="border-b text-left">
                    <th className="px-4 py-3 font-medium">Factura</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Pago</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => {
                    const isExpanded = expandedSaleId === sale.id
                    const canReturn = sale.status === 'COMPLETED'

                    return (
                      <Fragment key={sale.id}>
                        <tr
                          className={cn(
                            'border-b cursor-pointer hover:bg-muted/30',
                            isExpanded && 'bg-muted/20'
                          )}
                          onClick={() =>
                            setExpandedSaleId((current) => (current === sale.id ? null : sale.id))
                          }
                        >
                          <td className="px-4 py-3 font-medium">
                            <span className="inline-flex items-center gap-2">
                              <ChevronDown
                                className={cn(
                                  'text-muted-foreground size-4 shrink-0 transition-transform',
                                  isExpanded && 'rotate-180'
                                )}
                              />
                              <Link
                                to={`/ventas/${sale.id}`}
                                className="hover:underline"
                                onClick={(event) => event.stopPropagation()}
                              >
                                {sale.code ?? `#${sale.id}`}
                              </Link>
                            </span>
                          </td>
                          <td className="text-muted-foreground px-4 py-3">
                            {formatSaleDate(sale.sold_at ?? sale.confirmed_at)}
                          </td>
                          <td className="px-4 py-3">
                            {sale.customer?.name ?? sale.guest_name ?? 'Sin cliente'}
                          </td>
                          <td className="px-4 py-3">
                            <SaleStatusBadge
                              billingMode={sale.billing_mode}
                              orderStatus={sale.order_status}
                              status={sale.status}
                            />
                          </td>
                          <td className="px-4 py-3">
                            {sale.payment_type === 'CREDIT' ? (
                              <span className="text-amber-800 dark:text-amber-300">
                                Crédito
                                {Number(sale.balance_usd) > 0 ? (
                                  <span className="text-muted-foreground block text-xs">
                                    Saldo:{' '}
                                    <DisplayMoneyFromUsd amountUsd={sale.balance_usd} size="sm" />
                                  </span>
                                ) : null}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                {paymentMethodLabel(sale.payment_method) || 'Contado'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <DisplayMoneyFromUsd amountUsd={sale.total_usd} size="sm" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              {canReturn ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Devolver ${sale.code}`}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setReturnSaleId(sale.id)
                                  }}
                                >
                                  <RotateCcw />
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                        {isExpanded ? <VentasHistoryOrderLines saleId={sale.id} /> : null}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {meta && meta.lastPage > 1 ? (
            <div className="flex shrink-0 items-center justify-between gap-4">
              <p className="text-muted-foreground text-sm">
                Página {meta.currentPage} de {meta.lastPage}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.currentPage >= meta.lastPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <VentasOrderReturnDialog
        open={returnSaleId !== null}
        onOpenChange={(open) => {
          if (!open) setReturnSaleId(null)
        }}
        saleId={returnSaleId}
        onSuccess={() => void refetch()}
      />
    </div>
  )
}
