import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, AlertTriangle, Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCustomersQuery } from '@/features/customers/hooks/use-customers'
import { OrderCatalogLinesTable } from '@/features/orders/components/order-detail/order-catalog-lines-table'
import { OrderHeaderForm } from '@/features/orders/components/order-detail/order-header-form'
import { OrderPaymentTypePanel } from '@/features/orders/components/order-detail/order-payment-type-panel'
import { OrderStockShortageDialog } from '@/features/orders/components/order-detail/order-stock-shortage-dialog'
import { OrderSummaryDetails } from '@/features/orders/components/order-detail/order-summary-details'
import { OrderEstadoBadge } from '@/features/orders/components/order-status-badge'
import { ESTADO_LABELS } from '@/features/orders/constants'
import {
  useDeleteOrderMutation,
  useOrderQuery,
  useOrderBudgetQuery,
  useOrderMaterialAvailabilityQuery,
  useTransicionOrderMutation,
  useUpdateOrderMutation,
} from '@/features/orders/hooks/use-orders'
import type { OrderEstado, OrderPaymentType, RecipeStockInsuficiente } from '@/features/orders/types'
import {
  availableOrderTransitions,
  buildTransitionPayload,
  orderHeaderSchema,
  toOrderHeaderPayload,
  toOrderHeaderValues,
  validateCreditPayment,
  type OrderHeaderFormInput,
  type OrderHeaderFormValues,
} from '@/features/orders/utils/order-detail-form'
import { catalogLinesNetTotalUsd } from '@/features/orders/utils/order-line-totals'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { useFormatMoney } from '@/features/currencies/context/display-currency-context'
import { notifyApiError } from '@/features/notifications/query-error-state'
import { toast } from '@/features/notifications/toast'
import { getApiError, parseStockInsuficienteDetails } from '@/lib/api-error'
import { detailPageErrorMessage } from '@/lib/detail-page-messages'
import { parsePositiveIntRouteParam } from '@/lib/route-id'
import { cn } from '@/lib/utils'
import { pageHeaderClass } from '@/components/layout/responsive-toolbar'
import { formatDraftMaterialNotice } from '@/lib/material-availability'
import { OrderReturnDialog } from '@/features/orders/components/order-return-dialog'
import { useAuth } from '@/features/auth/hooks/use-auth'

type OrderDetailLocationState = {
  paymentType?: OrderPaymentType
}

export function OrderDetallePage() {
  const { id } = useParams<{ id: string }>()
  const { id: orderId, isValid: isValidOrderId } = parsePositiveIntRouteParam(id)
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as OrderDetailLocationState | null
  const { can } = useAuth()
  const canCreditSale = can('ventas.credit')

  const [paymentType, setPaymentType] = useState<OrderPaymentType>('CASH')
  const [transicionPending, setTransicionPending] = useState<OrderEstado | null>(null)
  const [stockModalOpen, setStockModalOpen] = useState(false)
  const [stockInsuficiente, setStockInsuficiente] = useState<RecipeStockInsuficiente[]>([])
  const [forceConfirmOpen, setForceConfirmOpen] = useState(false)
  const [transitionForcePending, setTransitionForcePending] = useState(false)
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)

  const { data: order, isLoading, isError, error, refetch } = useOrderQuery(orderId)
  const { data: budget } = useOrderBudgetQuery(orderId, order?.status === 'DRAFT')
  const { data: materialAvailability } = useOrderMaterialAvailabilityQuery(
    orderId,
    order?.status === 'DRAFT' || order?.status === 'CONFIRMED'
  )
  const { data: customersData } = useCustomersQuery({ page: 1, perPage: 100, active: true })
  const updateMutation = useUpdateOrderMutation()
  const deleteMutation = useDeleteOrderMutation()
  const transicionMutation = useTransicionOrderMutation()
  const { formatFromUsd } = useFormatMoney()

  const isBorrador = order?.status === 'DRAFT'
  const canUseCredit =
    Boolean(order?.customerId) &&
    Boolean(order?.customer?.creditDays && order.customer.creditDays > 0) &&
    canCreditSale

  const headerForm = useForm<OrderHeaderFormInput, unknown, OrderHeaderFormValues>({
    resolver: zodResolver(orderHeaderSchema),
    values: order ? toOrderHeaderValues(order) : undefined,
  })
  const { handleSubmit, reset, watch } = headerForm

  const clientMode = watch('client_mode')

  useEffect(() => {
    if (!order) {
      return
    }

    const preferredPaymentType = locationState?.paymentType ?? order.paymentType ?? 'CASH'
    setPaymentType(preferredPaymentType === 'CREDIT' && !canUseCredit ? 'CASH' : preferredPaymentType)
  }, [canUseCredit, locationState?.paymentType, order])

  useEffect(() => {
    if (paymentType === 'CREDIT' && !canUseCredit) {
      setPaymentType('CASH')
    }
  }, [canUseCredit, paymentType])

  useEffect(() => {
    if (clientMode === 'guest' && paymentType === 'CREDIT') {
      setPaymentType('CASH')
    }
  }, [clientMode, paymentType])

  const canReturn =
    order?.status === 'CONFIRMED' ||
    order?.status === 'IN_PRODUCTION' ||
    order?.status === 'DELIVERED'
  const pendingMaterialNotice =
    materialAvailability?.has_recipe && !materialAvailability.sufficient
      ? formatDraftMaterialNotice(materialAvailability.missing)
      : null
  const catalogLines = order?.lines ?? []
  const legacyRecipe = order?.materials ?? []
  const showRecetaVaciaBanner =
    order?.status === 'IN_PRODUCTION' && legacyRecipe.length === 0 && catalogLines.length === 0
  const customers = customersData?.customers ?? []
  const customerNombre =
    order?.customer?.name ??
    order?.guestName ??
    customers.find((c) => c.id === order?.customerId)?.name ??
    'Sin cliente'

  if (!isValidOrderId) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-muted-foreground text-sm">
          {detailPageErrorMessage({
            isValidId: false,
            isError: false,
            error: null,
            entityLabel: 'pedido',
          })}
        </p>
        <Button variant="outline" asChild>
          <Link to="/ventas">Volver al listado</Link>
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-24 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Cargando pedido…
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className={cn('text-sm whitespace-pre-line', isError ? 'text-destructive' : 'text-muted-foreground')}>
          {detailPageErrorMessage({
            isValidId: true,
            isError,
            error,
            entityLabel: 'pedido',
          })}
        </p>
        <Button variant="outline" asChild>
          <Link to="/ventas">Volver al listado</Link>
        </Button>
      </div>
    )
  }

  const activeOrder = order

  const transiciones = availableOrderTransitions(activeOrder.status, catalogLines.length)
  const catalogNetTotalUsd =
    catalogLines.length > 0
      ? catalogLinesNetTotalUsd(catalogLines)
      : Number(order.totalPrice ?? 0)

  const onSaveHeader = handleSubmit(async (values) => {
    try {
      await updateMutation.mutateAsync({ id: orderId, payload: toOrderHeaderPayload(values) })
      reset(values)
    } catch (err) {
      notifyApiError(err)
    }
  })

  async function handleDelete() {
    if (!window.confirm('¿Eliminar este pedido en borrador?')) {
      return
    }
    try {
      await deleteMutation.mutateAsync(orderId)
      void navigate('/ventas')
    } catch (err) {
      notifyApiError(err)
    }
  }

  async function handleTransicion(nuevoEstado: OrderEstado) {
    if (
      activeOrder.status === 'DRAFT' &&
      (nuevoEstado === 'CONFIRMED' || nuevoEstado === 'DELIVERED')
    ) {
      const creditError = validateCreditPayment(paymentType, activeOrder)
      if (creditError) {
        toast.warning(creditError)
        return
      }
    }

    const label = ESTADO_LABELS[nuevoEstado]
    const confirmMsg =
      nuevoEstado === 'CANCELLED'
        ? '¿Cancelar este pedido?'
        : `¿Confirmar transición a "${label}"?`

    if (!window.confirm(confirmMsg)) {
      return
    }

    setTransicionPending(nuevoEstado)
    try {
      await transicionMutation.mutateAsync({
        id: orderId,
        payload: buildTransitionPayload(nuevoEstado, activeOrder.status, paymentType),
      })
    } catch (err) {
      const apiError = getApiError(err)
      const stockDetails = parseStockInsuficienteDetails(apiError.details)
      if (
        nuevoEstado === 'IN_PRODUCTION' &&
        apiError.code === 'STOCK_INSUFICIENTE' &&
        stockDetails
      ) {
        setStockInsuficiente(stockDetails)
        setForceConfirmOpen(false)
        setStockModalOpen(true)
      } else {
        notifyApiError(err)
      }
    } finally {
      setTransicionPending(null)
    }
  }

  async function handleForceTransition() {
    setTransitionForcePending(true)
    try {
      await transicionMutation.mutateAsync({
        id: orderId,
        payload: buildTransitionPayload('IN_PRODUCTION', activeOrder.status, paymentType, true),
      })
      setStockModalOpen(false)
      setForceConfirmOpen(false)
      setStockInsuficiente([])
    } catch (err) {
      notifyApiError(err)
    } finally {
      setTransitionForcePending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className={pageHeaderClass}>
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
            <Link to="/ventas">
              <ArrowLeft />
              Pedidos
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{order.code}</h1>
            <OrderEstadoBadge status={order.status} />
          </div>
          <p className="text-muted-foreground text-sm">
            Cliente:{' '}
            {order.customerId ? (
              <Link to={`/customers/${order.customerId}`} className="text-foreground hover:underline">
                {customerNombre}
              </Link>
            ) : (
              <span className="text-foreground">{customerNombre}</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {transiciones.map((t) => (
            <Button
              key={t.destino}
              variant={t.variant ?? 'default'}
              size="sm"
              disabled={transicionMutation.isPending}
              onClick={() => void handleTransicion(t.destino)}
            >
              {transicionPending === t.destino ? (
                <Loader2 className="animate-spin" />
              ) : null}
              {t.label}
            </Button>
          ))}
          {isBorrador ? (
            <Button variant="destructive" size="sm" onClick={() => void handleDelete()}>
              <Trash2 />
              Eliminar
            </Button>
          ) : null}
          {canReturn ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReturnDialogOpen(true)}
            >
              <RotateCcw />
              Devolución de venta
            </Button>
          ) : null}
        </div>
      </div>

      {isBorrador ? (
        <OrderPaymentTypePanel
          paymentType={paymentType}
          canUseCredit={canUseCredit}
          creditDays={order.customerId ? (order.customer?.creditDays ?? 0) : null}
          onChange={setPaymentType}
        />
      ) : null}
      {pendingMaterialNotice ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p className="whitespace-pre-line">{pendingMaterialNotice}</p>
        </div>
      ) : null}
      {showRecetaVaciaBanner ? (
        <div className="bg-yellow-50 text-yellow-900 flex items-start gap-2 rounded-md border border-yellow-300 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>Este pedido pasó a producción sin receta definida; no se descontó inventario.</p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del pedido</CardTitle>
          <CardDescription>
            {isBorrador
              ? 'Editá los datos mientras esté en borrador.'
              : 'Solo lectura — el pedido ya no está en borrador.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isBorrador ? (
            <OrderHeaderForm form={headerForm} customers={customers} onSubmit={onSaveHeader} />
          ) : (
            <OrderSummaryDetails
              order={order}
              netTotalUsd={catalogNetTotalUsd}
              hasReturnedLines={catalogLines.some(
                (line) => Number(line.returned_quantity ?? 0) > 0
              )}
            />
          )}
        </CardContent>
      </Card>

      {catalogLines.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Productos del catálogo</CardTitle>
            <CardDescription>
              Líneas del carrito al crear el pedido
              {isBorrador && budget ? (
                <>
                  {' '}
                  — Presupuesto: <DisplayMoneyFromUsd amountUsd={budget.total_usd} size="sm" />
                </>
              ) : (
                ''
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OrderCatalogLinesTable lines={catalogLines} formatFromUsd={formatFromUsd} />
          </CardContent>
        </Card>
      ) : null}

      <OrderReturnDialog
        open={returnDialogOpen}
        onOpenChange={setReturnDialogOpen}
        orderId={orderId}
        onSuccess={() => void refetch()}
      />

      <OrderStockShortageDialog
        open={stockModalOpen}
        onOpenChange={(open) => {
          setStockModalOpen(open)
          if (!open) {
            setForceConfirmOpen(false)
          }
        }}
        items={stockInsuficiente}
        forceConfirmOpen={forceConfirmOpen}
        forcePending={transitionForcePending}
        onCancel={() => setStockModalOpen(false)}
        onRequestForce={() => setForceConfirmOpen(true)}
        onForce={() => void handleForceTransition()}
      />
    </div>
  )
}
