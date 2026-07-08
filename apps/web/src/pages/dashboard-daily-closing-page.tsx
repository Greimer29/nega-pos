import { ArrowLeft, Loader2 } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DailySoldProductCard } from '@/features/dashboard/components/daily-sold-product-card'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { useDailyClosingQuery } from '@/features/dashboard/hooks/use-dashboard'
import { paymentMethodLabel } from '@/features/ventas/constants'
import { getApiErrorMessage } from '@/lib/api-error'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
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
  const [searchParams, setSearchParams] = useSearchParams()
  const date = searchParams.get('date') ?? todayIso()
  const { data, isLoading, isError, error } = useDailyClosingQuery(date)

  const dateLabel = useMemo(() => formatDateLabel(date), [date])

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
        <p className="text-muted-foreground text-sm capitalize">{dateLabel}</p>
      </div>

      <div className="max-w-xs space-y-2">
        <Label htmlFor="closing-date">Fecha</Label>
        <Input
          id="closing-date"
          type="date"
          value={date}
          onChange={(event) => setSearchParams({ date: event.target.value })}
        />
      </div>

      {isLoading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-24 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Cargando cierre diario…
        </div>
      ) : isError ? (
        <p className="text-destructive text-sm whitespace-pre-line">{getApiErrorMessage(error)}</p>
      ) : !data ? (
        <p className="text-muted-foreground py-24 text-center text-sm">
          No se recibió información del reporte.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                <p className="text-muted-foreground text-sm">Sin ventas de contado en esta fecha.</p>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Facturas del día</CardTitle>
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
