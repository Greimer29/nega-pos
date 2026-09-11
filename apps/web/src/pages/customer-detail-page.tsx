import { ArrowLeft, Loader2, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TIPO_LABELS } from '@/features/customers/constants'
import { CustomerFormDialog } from '@/features/customers/components/customer-form-dialog'
import { CustomerPaymentFormDialog } from '@/features/customers/components/customer-payment-form-dialog'
import { useCustomerQuery } from '@/features/customers/hooks/use-customers'
import { formatFecha } from '@/features/orders/constants'
import { DisplayMoney } from '@/features/currencies/components/display-money'
import { OrderEstadoBadge } from '@/features/orders/components/order-status-badge'
import type { OrderEstado } from '@/features/orders/types'
import { detailPageErrorMessage } from '@/lib/detail-page-messages'
import { parsePositiveIntRouteParam } from '@/lib/route-id'
import { cn } from '@/lib/utils'
import { pageHeaderClass } from '@/components/layout/responsive-toolbar'

export function CustomerDetallePage() {
  const { id } = useParams<{ id: string }>()
  const { id: customerId, isValid: isValidCustomerId } = parsePositiveIntRouteParam(id)
  const [editOpen, setEditOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)

  const { data: customer, isLoading, isError, error } = useCustomerQuery(customerId)

  if (!isValidCustomerId) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-muted-foreground text-sm">
          {detailPageErrorMessage({
            isValidId: false,
            isError: false,
            error: null,
            entityLabel: 'cliente',
          })}
        </p>
        <Button variant="outline" asChild>
          <Link to="/customers">Volver al listado</Link>
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-24 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Cargando cliente…
      </div>
    )
  }

  if (isError || !customer) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className={cn('text-sm whitespace-pre-line', isError ? 'text-destructive' : 'text-muted-foreground')}>
          {detailPageErrorMessage({
            isValidId: true,
            isError,
            error,
            entityLabel: 'cliente',
          })}
        </p>
        <Button variant="outline" asChild>
          <Link to="/customers">Volver al listado</Link>
        </Button>
      </div>
    )
  }

  const orders = customer.orders ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className={pageHeaderClass}>
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
            <Link to="/customers">
              <ArrowLeft />
              Clientes
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
            <span
              className={cn(
                'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                customer.active
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {customer.active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">{TIPO_LABELS[customer.type]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(customer.creditDays ?? 0) > 0 ? (
            <>
              <Button variant="outline" asChild>
                <Link to={`/customers/${customerId}/cuenta`}>Ver estado de cuenta</Link>
              </Button>
              <Button onClick={() => setPaymentOpen(true)}>
                <Plus />
                Registrar abono
              </Button>
            </>
          ) : null}
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil />
            Editar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de contacto</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Teléfono:</span> {customer.phone ?? '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span> {customer.email ?? '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Documento:</span> {customer.document ?? '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Dirección:</span> {customer.address ?? '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Días de crédito:</span>{' '}
            {customer.creditDays ?? 0}
          </p>
          {customer.notes ? (
            <p className="sm:col-span-2">
              <span className="text-muted-foreground">Notas:</span> {customer.notes}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de pedidos</CardTitle>
          <CardDescription>
            {orders.length === 0
              ? 'Este cliente aún no tiene pedidos registrados.'
              : `${orders.length} pedido${orders.length === 1 ? '' : 's'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">Sin pedidos.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b text-left">
                    <th className="px-4 py-3 font-medium">Código</th>
                    <th className="px-4 py-3 font-medium">Descripción</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Cantidad</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Precio</th>
                    <th className="px-4 py-3 text-right font-medium">Ver</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-mono text-xs">{order.code}</td>
                      <td className="px-4 py-3">{order.description}</td>
                      <td className="px-4 py-3">
                        <OrderEstadoBadge status={order.status as OrderEstado} />
                      </td>
                      <td className="px-4 py-3">{order.totalQuantity}</td>
                      <td className="px-4 py-3">{formatFecha(order.dateOrder)}</td>
                      <td className="px-4 py-3">
                        <DisplayMoney amount={order.totalPrice} currencyCode="USD" size="sm" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/orders/${order.id}`}>Ver</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerFormDialog open={editOpen} onOpenChange={setEditOpen} customer={customer} />
      <CustomerPaymentFormDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        customerId={customerId}
      />
    </div>
  )
}
