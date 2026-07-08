import { ArrowLeft, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DailySoldProductCard } from '@/features/dashboard/components/daily-sold-product-card'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { useDailyProductSalesQuery } from '@/features/dashboard/hooks/use-dashboard'
import { getApiErrorMessage } from '@/lib/api-error'

function todayLabel() {
  return new Date().toLocaleDateString('es-VE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function DashboardDailyProductsPage() {
  const { data, isLoading, isError, error } = useDailyProductSalesQuery()

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
          <Link to="/dashboard">
            <ArrowLeft />
            Dashboard
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Productos vendidos hoy</h1>
        <p className="text-muted-foreground text-sm capitalize">{todayLabel()}</p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-24 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Cargando ventas del día…
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
            <CardTitle className="text-base">Detalle por producto</CardTitle>
            <CardDescription>
              {data.summary.productos_vendidos.toLocaleString('es-VE')} unidades ·{' '}
              <DisplayMoneyFromUsd
                amountUsd={data.summary.monto_productos_usd}
                className="inline text-sm font-medium"
              />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.products.length === 0 ? (
              <p className="text-muted-foreground py-12 text-center text-sm">
                No hay productos vendidos hoy.
              </p>
            ) : (
              data.products.map((product) => (
                <DailySoldProductCard key={product.id} product={product} />
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
