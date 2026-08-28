import { ArrowLeft, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { DailyExpenseList } from '@/features/dashboard/components/daily-expense-list'
import { DailySoldProductCard } from '@/features/dashboard/components/daily-sold-product-card'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { useDailyClosingQuery } from '@/features/dashboard/hooks/use-dashboard'
import { useSalesShiftsQuery } from '@/features/ventas/hooks/use-sales-shifts'
import type { SalesShift } from '@/features/ventas/services/sales-shift-service'
import { paymentMethodLabel } from '@/features/ventas/constants'
import { getApiErrorMessage } from '@/lib/api-error'

function formatShiftRange(shift: SalesShift) {
  const opened = new Date(shift.opened_at).toLocaleString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  if (!shift.closed_at) {
    return `${opened} → en curso`
  }
  const closed = new Date(shift.closed_at).toLocaleString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${opened} → ${closed}`
}

function formatDateLabel(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es-VE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function DashboardDailyClosingPage() {
  const shiftsQuery = useSalesShiftsQuery({ per_page: 50 })
  const shifts = shiftsQuery.data?.sales_shifts ?? []
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null)

  useEffect(() => {
    if (selectedShiftId != null) return
    if (shifts.length === 0) return
    const open = shifts.find((shift) => shift.status === 'OPEN')
    setSelectedShiftId(Number(open?.id ?? shifts[0].id))
  }, [shifts, selectedShiftId])

  const selectedShift = useMemo(
    () => shifts.find((shift) => Number(shift.id) === selectedShiftId) ?? null,
    [shifts, selectedShiftId]
  )

  const { data, isLoading, isError, error } = useDailyClosingQuery(selectedShiftId ?? undefined)

  const expensesCount = data?.summary.expenses_count ?? 0
  const expensesTotalUsd = data?.summary.expenses_total_usd ?? '0.0000'
  const netCashUsd =
    data?.summary.net_cash_usd ??
    (data
      ? (Number(data.summary.cash_total_usd) - Number(expensesTotalUsd)).toFixed(4)
      : '0.0000')
  const expenseItems = data?.expenses?.items ?? []
  const expenseSummary = data?.expenses?.summary ?? {
    gastos_cantidad: 0,
    gastos_monto_usd: '0.0000',
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
          <Link to="/dashboard">
            <ArrowLeft />
            Dashboard
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Cierre diario</h1>
        <p className="text-muted-foreground text-sm">
          {selectedShift ? formatShiftRange(selectedShift) : 'Elegí un turno para ver el cierre'}
        </p>
      </div>

      <div className="max-w-md space-y-2">
        <Label htmlFor="closing-shift">Turno</Label>
        <select
          id="closing-shift"
          className="border-input flex h-9 w-full rounded-md border bg-white px-3 text-sm"
          value={selectedShiftId ?? ''}
          disabled={shiftsQuery.isLoading || shifts.length === 0}
          onChange={(event) => {
            const value = Number(event.target.value)
            setSelectedShiftId(value > 0 ? value : null)
          }}
        >
          {shifts.length === 0 ? (
            <option value="">Sin turnos registrados</option>
          ) : (
            shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {formatShiftRange(shift)}
                {shift.status === 'OPEN' ? ' (abierto)' : ''}
              </option>
            ))
          )}
        </select>
      </div>

      {shiftsQuery.isLoading || (selectedShiftId != null && isLoading) ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-24 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Cargando cierre diario…
        </div>
      ) : isError ? (
        <p className="text-destructive text-sm whitespace-pre-line">{getApiErrorMessage(error)}</p>
      ) : !data ? (
        <p className="text-muted-foreground py-24 text-center text-sm">
          {selectedShiftId == null
            ? 'Seleccioná un turno para ver el cierre.'
            : 'No se recibió información del reporte.'}
        </p>
      ) : (
        <>
          {data.expenses == null ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              El servidor no devolvió gastos en el cierre. Reconstruí la API (
              <code className="text-xs">docker compose up -d --build api</code>
              ) o usá <code className="text-xs">pnpm dev:api</code> en el host.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Facturas</CardDescription>
                <CardTitle className="text-2xl">{data.summary.invoices_count}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Contado</CardDescription>
                <CardTitle className="text-2xl">
                  <DisplayMoneyFromUsd amountUsd={data.summary.cash_total_usd} />
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Crédito</CardDescription>
                <CardTitle className="text-2xl">
                  <DisplayMoneyFromUsd amountUsd={data.summary.credit_total_usd} />
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Gastos</CardDescription>
                <CardTitle className="text-2xl">
                  <DisplayMoneyFromUsd amountUsd={expensesTotalUsd} />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-xs">
                  {expensesCount.toLocaleString('es-VE')} registro
                  {expensesCount === 1 ? '' : 's'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Efectivo neto</CardDescription>
                <CardTitle className="text-2xl">
                  <DisplayMoneyFromUsd amountUsd={netCashUsd} />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-xs">Contado − gastos</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Devoluciones</CardDescription>
                <CardTitle className="text-2xl">{data.summary.returns_count}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Totales por método de pago</CardTitle>
              <CardDescription>Solo ventas de contado</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {data.by_payment_method.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sin ventas de contado en este turno.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-3 py-2 font-medium">Método</th>
                      <th className="px-3 py-2 font-medium">Moneda</th>
                      <th className="px-3 py-2 text-right font-medium">Ventas</th>
                      <th className="px-3 py-2 text-right font-medium">Total USD</th>
                      <th className="px-3 py-2 text-right font-medium">Total moneda</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_payment_method.map((item) => (
                      <tr key={item.code} className="border-b last:border-b-0">
                        <td className="px-3 py-2">{item.name}</td>
                        <td className="px-3 py-2">{item.currency_code}</td>
                        <td className="px-3 py-2 text-right">{item.sales_count}</td>
                        <td className="px-3 py-2 text-right">
                          <DisplayMoneyFromUsd amountUsd={item.total_usd} size="sm" />
                        </td>
                        <td className="px-3 py-2 text-right">
                          {item.total_in_currency ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {data.expenses != null ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gastos del turno</CardTitle>
                <CardDescription>
                  {expenseSummary.gastos_cantidad.toLocaleString('es-VE')} registro
                  {expenseSummary.gastos_cantidad === 1 ? '' : 's'} ·{' '}
                  <DisplayMoneyFromUsd
                    amountUsd={expenseSummary.gastos_monto_usd}
                    className="inline text-sm font-medium"
                  />
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DailyExpenseList items={expenseItems} />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Facturas del turno</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {data.invoices.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hay facturas confirmadas.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-3 py-2 font-medium">Código</th>
                      <th className="px-3 py-2 font-medium">Cliente</th>
                      <th className="px-3 py-2 font-medium">Tipo</th>
                      <th className="px-3 py-2 font-medium">Método</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">
                          <Link className="text-primary hover:underline" to={`/ventas/${invoice.id}`}>
                            {invoice.code ?? `#${invoice.id}`}
                          </Link>
                        </td>
                        <td className="px-3 py-2">{invoice.customer_name}</td>
                        <td className="px-3 py-2">
                          {invoice.payment_type === 'CREDIT' ? 'Crédito' : 'Contado'}
                        </td>
                        <td className="px-3 py-2">
                          {invoice.payment_type === 'CREDIT'
                            ? '—'
                            : paymentMethodLabel(
                                invoice.payment_method_name
                                  ? { name: invoice.payment_method_name }
                                  : invoice.payment_method_code
                              )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <DisplayMoneyFromUsd amountUsd={invoice.total_usd} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Productos vendidos</CardTitle>
              <CardDescription>
                {data.summary.products_sold.toLocaleString('es-VE')} unidades ·{' '}
                <DisplayMoneyFromUsd
                  amountUsd={data.summary.products_amount_usd}
                  className="inline text-sm font-medium"
                />
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.products.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">Sin productos vendidos.</p>
              ) : (
                data.products.map((product) => (
                  <DailySoldProductCard key={product.id} product={product} />
                ))
              )}
            </CardContent>
          </Card>

          {data.returns.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Devoluciones</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-3 py-2 font-medium">Factura</th>
                      <th className="px-3 py-2 font-medium">Fecha</th>
                      <th className="px-3 py-2 text-right font-medium">Total USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.returns.map((item) => (
                      <tr key={item.sale_id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">
                          <Link className="text-primary hover:underline" to={`/ventas/${item.sale_id}`}>
                            {item.sale_code ?? `#${item.sale_id}`}
                          </Link>
                        </td>
                        <td className="px-3 py-2">{formatDateLabel(item.returned_at.slice(0, 10))}</td>
                        <td className="px-3 py-2 text-right">
                          <DisplayMoneyFromUsd amountUsd={item.total_returned_usd} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  )
}
