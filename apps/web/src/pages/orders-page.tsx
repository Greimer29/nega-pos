import { Eye, Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { NuevoOrderDialog } from '@/features/orders/components/new-order-dialog'
import { OrderEstadoBadge } from '@/features/orders/components/order-status-badge'
import { formatFecha, ESTADO_LABELS, MODALIDAD_LABELS } from '@/features/orders/constants'
import { useOrdersQuery } from '@/features/orders/hooks/use-orders'
import type { OrderEstado } from '@/features/orders/types'
import { useCustomersQuery } from '@/features/customers/hooks/use-customers'
import { QueryErrorState } from '@/features/notifications/query-error-state'
import { sessionFilterKey, useSessionPersistedState } from '@/lib/session-persisted-state'

const PER_PAGE = 20

type OrdersFilters = {
  status: OrderEstado | ''
  customerId: number | ''
  page: number
}

const DEFAULT_ORDERS_FILTERS: OrdersFilters = {
  status: '',
  customerId: '',
  page: 1,
}

export function OrdersPage() {
  const { company } = useAuth()
  const [filters, setFilters] = useSessionPersistedState(
    sessionFilterKey('orders', company?.id),
    DEFAULT_ORDERS_FILTERS
  )
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: customersData } = useCustomersQuery({ page: 1, perPage: 100, active: true })
  const { data, isLoading, isError, error } = useOrdersQuery({
    page: filters.page,
    perPage: PER_PAGE,
    status: filters.status || undefined,
    customer_id: filters.customerId || undefined,
  })

  const orders = data?.orders ?? []
  const meta = data?.meta
  const customers = customersData?.customers ?? []
  const customerMap = new Map(customers.map((c) => [c.id, c.name]))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
          <p className="text-muted-foreground text-sm">Seguimiento de pedidos desde borrador hasta entrega.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus />
          Nuevo pedido
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs font-medium">Estado</label>
            <select
              className="border-input bg-background flex h-9 min-w-[160px] rounded-md border px-3 text-sm"
              value={filters.status}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as OrderEstado | '',
                  page: 1,
                }))
              }}
            >
              <option value="">Todos</option>
              {(
                ['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'DELIVERED', 'CANCELLED', 'RETURNED'] as const
              ).map((e) => (
                <option key={e} value={e}>
                  {ESTADO_LABELS[e]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs font-medium">Cliente</label>
            <select
              className="border-input bg-background flex h-9 min-w-[180px] rounded-md border px-3 text-sm"
              value={filters.customerId}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  customerId: e.target.value ? Number(e.target.value) : '',
                  page: 1,
                }))
              }}
            >
              <option value="">Todos</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listado</CardTitle>
          <CardDescription>
            {meta ? `${meta.total} pedido${meta.total === 1 ? '' : 's'}` : 'Cargando…'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Cargando pedidos…
            </div>
          ) : isError ? (
            <QueryErrorState isError error={error} title="No se pudieron cargar los pedidos" />
          ) : orders.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No hay pedidos con estos filtros.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b text-left">
                      <th className="px-4 py-3 font-medium">Código</th>
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium">Descripción</th>
                      <th className="px-4 py-3 font-medium">Modalidad</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                      <th className="px-4 py-3 font-medium">Cantidad</th>
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3 font-mono text-xs">{order.code}</td>
                        <td className="px-4 py-3">
                          {order.customer?.name ??
                            order.guestName ??
                            (order.customerId != null
                              ? (customerMap.get(order.customerId) ?? `#${order.customerId}`)
                              : 'Sin cliente')}
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-3">{order.description}</td>
                        <td className="text-muted-foreground px-4 py-3">
                          {MODALIDAD_LABELS[order.modalidad]}
                        </td>
                        <td className="px-4 py-3">
                          <OrderEstadoBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3">{order.totalQuantity}</td>
                        <td className="px-4 py-3">{formatFecha(order.dateOrder)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/orders/${order.id}`}>
                              <Eye />
                              Ver
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {meta && meta.lastPage > 1 ? (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">
                    Página {meta.currentPage} de {meta.lastPage}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={filters.page <= 1}
                      onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={filters.page >= meta.lastPage}
                      onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <NuevoOrderDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
