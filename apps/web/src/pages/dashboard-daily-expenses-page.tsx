import { ArrowLeft, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { useDailyExpensesQuery } from '@/features/dashboard/hooks/use-dashboard'
import type { DailyExpenseItem } from '@/features/dashboard/types'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

function todayLabel() {
  return new Date().toLocaleDateString('es-VE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function expenseKindLabel(item: DailyExpenseItem) {
  return item.kind === 'machine_expense' ? 'Gasto máquina' : 'Gasto empresa'
}

function expenseDetail(item: DailyExpenseItem) {
  if (item.kind === 'machine_expense' && item.machine_name) {
    return item.category ? `${item.machine_name} · ${item.category}` : item.machine_name
  }
  return null
}

export function DashboardDailyExpensesPage() {
  const { data, isLoading, isError, error } = useDailyExpensesQuery()

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
          <Link to="/dashboard">
            <ArrowLeft />
            Dashboard
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Gastos del día</h1>
        <p className="text-muted-foreground text-sm capitalize">{todayLabel()}</p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-24 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Cargando gastos del día…
        </div>
      ) : isError ? (
        <p className="text-destructive text-sm whitespace-pre-line">{getApiErrorMessage(error)}</p>
      ) : !data ? (
        <p className="text-muted-foreground py-24 text-center text-sm">
          No se recibió información del reporte. Intentá actualizar la página.
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalle de gastos</CardTitle>
            <CardDescription>
              {data.summary.gastos_cantidad.toLocaleString('es-VE')} registro
              {data.summary.gastos_cantidad === 1 ? '' : 's'} ·{' '}
              <DisplayMoneyFromUsd
                amountUsd={data.summary.gastos_monto_usd}
                className="inline text-sm font-medium"
              />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.items.length === 0 ? (
              <p className="text-muted-foreground py-12 text-center text-sm">
                No hay gastos registrados hoy.
              </p>
            ) : (
              data.items.map((item) => {
                const detail = expenseDetail(item)

                return (
                  <div
                    key={`${item.kind}-${item.id}`}
                    className="flex items-start justify-between gap-4 rounded-xl border border-neutral-200 p-4"
                  >
                    <div className="min-w-0 space-y-1">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                          item.kind === 'machine_expense'
                            ? 'bg-teal-50 text-teal-800'
                            : 'bg-slate-100 text-slate-700'
                        )}
                      >
                        {expenseKindLabel(item)}
                      </span>
                      <p className="font-medium text-neutral-900">{item.description}</p>
                      {detail ? <p className="text-muted-foreground text-sm">{detail}</p> : null}
                    </div>
                    <DisplayMoneyFromUsd
                      amountUsd={item.amount_usd}
                      className="shrink-0 text-sm font-semibold text-neutral-900"
                    />
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
