import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, AlertTriangle, Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MoneyInput } from '@/components/decimal-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCustomersQuery } from '@/features/customers/hooks/use-customers'
import { OrderEstadoBadge } from '@/features/orders/components/order-status-badge'
import {
  ESTADO_LABELS,
  formatFecha,
  MODALIDAD_LABELS,
  TRANSICIONES,
} from '@/features/orders/constants'
import {
  useDeleteOrderMutation,
  useOrderQuery,
  useOrderBudgetQuery,
  useOrderMaterialAvailabilityQuery,
  useTransicionOrderMutation,
  useUpdateOrderMutation,
} from '@/features/orders/hooks/use-orders'
import type {
  Order,
  OrderEstado,
  OrderPaymentType,
  OrderTransicionInput,
  RecipeStockInsuficiente,
} from '@/features/orders/types'
import {
  catalogLinesNetTotalUsd,
  orderLineActiveQuantity,
  orderLineNetSubtotalUsd,
} from '@/features/orders/utils/order-line-totals'
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

function buildTransitionPayload(
  nuevoEstado: OrderEstado,
  currentStatus: OrderEstado,
  paymentType: OrderPaymentType,
  force?: boolean
): OrderTransicionInput {
  const payload: OrderTransicionInput = { new_status: nuevoEstado }
  if (force) {
    payload.force = true
  }
  if (currentStatus === 'DRAFT' && (nuevoEstado === 'CONFIRMED' || nuevoEstado === 'DELIVERED')) {
    payload.payment_type = paymentType
  }
  return payload
}

function validateCreditPayment(paymentType: OrderPaymentType, order: Order): string | null {
  if (paymentType !== 'CREDIT') {
    return null
  }
  if (!order.customerId) {
    return 'El crédito solo está disponible para clientes registrados.'
  }
  if (!order.customer?.creditDays || order.customer.creditDays <= 0) {
    return 'El cliente no tiene días de crédito configurados.'
  }
  return null
}

const headerSchema = z
  .object({
    client_mode: z.enum(['registered', 'guest']),
    customer_id: z.union([z.literal(''), z.coerce.number().min(1)]).optional(),
    guest_name: z.string().trim().max(150).optional(),
    modalidad: z.enum(['WHITE_LABEL', 'CORPORATE']),
    description: z.string().trim().min(1),
    quantity_total: z.coerce.number().min(1),
    date_order: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    date_entrega_estimada: z
      .union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
      .optional(),
    total_price: z.union([z.literal(''), z.coerce.number().min(0)]).optional(),
    notes: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.client_mode === 'registered') {
      const customerId =
        typeof data.customer_id === 'number' ? data.customer_id : Number(data.customer_id)
      if (!customerId || customerId < 1) {
        ctx.addIssue({
          code: 'custom',
          message: 'Seleccioná un cliente registrado',
          path: ['customer_id'],
        })
      }
    } else if (!data.guest_name?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Ingresá el nombre del invitado',
        path: ['guest_name'],
      })
    }
  })

type HeaderFormInput = z.input<typeof headerSchema>
type HeaderFormValues = z.infer<typeof headerSchema>

function toHeaderValues(order: Order): HeaderFormInput {
  const isGuest = !order.customerId
  return {
    client_mode: isGuest ? 'guest' : 'registered',
    customer_id: order.customerId ?? '',
    guest_name: order.guestName ?? '',
    modalidad: order.modalidad,
    description: order.description,
    quantity_total: order.totalQuantity,
    date_order: order.dateOrder,
    date_entrega_estimada: order.estimatedDeliveryDate ?? '',
    total_price: order.totalPrice ?? '',
    notes: order.notes ?? '',
  }
}

function toHeaderPayload(values: HeaderFormValues) {
  const base = {
    modalidad: values.modalidad,
    description: values.description.trim(),
    quantity_total: values.quantity_total,
    date_order: values.date_order,
    date_entrega_estimada: values.date_entrega_estimada?.trim() || undefined,
    total_price: values.total_price === '' ? undefined : Number(values.total_price),
    notes: values.notes?.trim() || undefined,
  }

  if (values.client_mode === 'registered') {
    return {
      ...base,
      customer_id: Number(values.customer_id),
    }
  }

  return {
    ...base,
    guest_name: values.guest_name!.trim(),
  }
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

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<HeaderFormInput, unknown, HeaderFormValues>({
    resolver: zodResolver(headerSchema),
    values: order ? toHeaderValues(order) : undefined,
  })

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

  const transiciones = TRANSICIONES[activeOrder.status].filter(
    (transition) =>
      !(
        isBorrador &&
        transition.destino === 'DELIVERED' &&
        catalogLines.length === 0
      )
  )
  const catalogNetTotalUsd =
    catalogLines.length > 0
      ? catalogLinesNetTotalUsd(catalogLines)
      : Number(order.totalPrice ?? 0)

  const onSaveHeader = handleSubmit(async (values) => {
    try {
      await updateMutation.mutateAsync({ id: orderId, payload: toHeaderPayload(values) })
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
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-md border bg-neutral-50 p-4">
          <div className="space-y-2">
            <Label className="text-xs">Forma de pago al facturar</Label>
            <div className="bg-muted inline-flex rounded-lg p-1">
              <button
                type="button"
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium',
                  paymentType === 'CASH' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                )}
                onClick={() => setPaymentType('CASH')}
              >
                Contado
              </button>
              <button
                type="button"
                disabled={!canUseCredit}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium',
                  paymentType === 'CREDIT' ? 'bg-background shadow-sm' : 'text-muted-foreground',
                  !canUseCredit && 'cursor-not-allowed opacity-50'
                )}
                onClick={() => setPaymentType('CREDIT')}
              >
                Crédito
              </button>
            </div>
            {paymentType === 'CREDIT' && order.customerId ? (
              <p className="text-muted-foreground text-xs">
                Plazo: {order.customer?.creditDays ?? 0} días
              </p>
            ) : null}
          </div>
          <p className="text-muted-foreground max-w-md text-xs">
            La forma de pago se aplica al confirmar o entregar la venta. Si venís desde Ventas, se
            conserva la selección que hayas hecho allí.
          </p>
        </div>
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
            <form onSubmit={onSaveHeader} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <div className="bg-muted inline-flex rounded-lg p-1">
                    <button
                      type="button"
                      className={cn(
                        'rounded-md px-3 py-1.5 text-xs font-medium',
                        clientMode === 'guest' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                      )}
                      onClick={() => {
                        setValue('client_mode', 'guest', { shouldDirty: true })
                        setValue('customer_id', '', { shouldDirty: true })
                      }}
                    >
                      Invitado
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'rounded-md px-3 py-1.5 text-xs font-medium',
                        clientMode === 'registered'
                          ? 'bg-background shadow-sm'
                          : 'text-muted-foreground'
                      )}
                      onClick={() => {
                        setValue('client_mode', 'registered', { shouldDirty: true })
                        setValue('guest_name', '', { shouldDirty: true })
                      }}
                    >
                      Registrado
                    </button>
                  </div>
                  {clientMode === 'guest' ? (
                    <>
                      <Input
                        id="guest_name"
                        placeholder="Nombre del invitado"
                        {...register('guest_name')}
                      />
                      {errors.guest_name ? (
                        <p className="text-destructive text-sm">{errors.guest_name.message}</p>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <select
                        id="customer_id"
                        className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                        {...register('customer_id')}
                      >
                        <option value="">Seleccionar cliente…</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {errors.customer_id ? (
                        <p className="text-destructive text-sm">{errors.customer_id.message}</p>
                      ) : null}
                    </>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modalidad">Modalidad</Label>
                  <select
                    id="modalidad"
                    className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                    {...register('modalidad')}
                  >
                    {(['WHITE_LABEL', 'CORPORATE'] as const).map((m) => (
                      <option key={m} value={m}>
                        {MODALIDAD_LABELS[m]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" rows={2} {...register('description')} />
                {errors.description ? (
                  <p className="text-destructive text-sm">{errors.description.message}</p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="quantity_total">Cantidad total</Label>
                  <Input id="quantity_total" type="number" min={1} {...register('quantity_total')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_order">Fecha de pedido</Label>
                  <Input id="date_order" type="date" {...register('date_order')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_entrega_estimada">Entrega estimada</Label>
                  <Input
                    id="date_entrega_estimada"
                    type="date"
                    {...register('date_entrega_estimada')}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="total_price">Precio total (USD $)</Label>
                  <MoneyInput id="total_price" min={0} {...register('total_price')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea id="notes" rows={2} {...register('notes')} />
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting || !isDirty}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : null}
                Guardar cambios
              </Button>
            </form>
          ) : (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Modalidad</dt>
                <dd>{MODALIDAD_LABELS[order.modalidad]}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Cantidad total</dt>
                <dd>{order.totalQuantity}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Descripción</dt>
                <dd>{order.description}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fecha de pedido</dt>
                <dd>{formatFecha(order.dateOrder)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Entrega estimada</dt>
                <dd>{formatFecha(order.estimatedDeliveryDate)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Precio total (USD $)</dt>
                <dd>
                  <DisplayMoneyFromUsd amountUsd={catalogNetTotalUsd} />
                  {catalogLines.some((line) => Number(line.returned_quantity ?? 0) > 0) ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Neto tras devoluciones (sin productos devueltos).
                    </p>
                  ) : null}
                </dd>
              </div>
              {order.notes ? (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Notas</dt>
                  <dd>{order.notes}</dd>
                </div>
              ) : null}
            </dl>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2">Producto</th>
                    <th className="pb-2 text-right">Cantidad</th>
                    <th className="pb-2 text-right">P. unit. USD</th>
                    <th className="pb-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogLines.map((line) => {
                    const returned = Number(line.returned_quantity ?? 0)
                    const activeQty = orderLineActiveQuantity(line)
                    const fullyReturned = activeQty <= 0
                    const netSubtotalUsd = orderLineNetSubtotalUsd(line)

                    return (
                    <tr
                      key={line.id}
                      className={cn('border-b', fullyReturned && 'bg-muted/30 text-muted-foreground')}
                    >
                      <td className="py-2">
                        <span className={cn(fullyReturned && 'line-through')}>
                          {line.catalog_product?.name ?? `Producto #${line.catalog_product_id}`}
                        </span>
                        {returned > 0 ? (
                          <span className="text-destructive ml-2 text-xs font-medium">
                            {fullyReturned ? 'Devuelto' : `Devuelto: ${returned}`}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {returned > 0 && !fullyReturned ? (
                          <span>
                            {activeQty.toLocaleString('es-VE')}{' '}
                            <span className="text-muted-foreground text-xs">
                              de {Number(line.quantity).toLocaleString('es-VE')}
                            </span>
                          </span>
                        ) : (
                          line.quantity
                        )}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatFromUsd(Number(line.unit_price_usd))}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {fullyReturned ? (
                          <span className="line-through">{formatFromUsd(Number(line.subtotal_usd))}</span>
                        ) : returned > 0 ? (
                          <span>
                            {formatFromUsd(netSubtotalUsd)}
                            <span className="text-muted-foreground ml-1 text-xs line-through">
                              {formatFromUsd(Number(line.subtotal_usd))}
                            </span>
                          </span>
                        ) : (
                          formatFromUsd(netSubtotalUsd)
                        )}
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <OrderReturnDialog
        open={returnDialogOpen}
        onOpenChange={setReturnDialogOpen}
        orderId={orderId}
        onSuccess={() => void refetch()}
      />

      <Dialog
        open={stockModalOpen}
        onOpenChange={(open) => {
          setStockModalOpen(open)
          if (!open) {
            setForceConfirmOpen(false)
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Stock insuficiente</DialogTitle>
            <DialogDescription>
              No hay inventario suficiente para pasar este pedido a producción.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            {stockInsuficiente.map((item) => (
              <div key={item.material_id} className="rounded-md border p-3">
                <p className="font-medium">{item.name}</p>
                <div className="text-muted-foreground mt-1 grid gap-1 text-xs sm:grid-cols-3">
                  <span>Stock actual: {item.stock_actual.toFixed(3)}</span>
                  <span>Consumo proyectado: {item.consumo_proyectado.toFixed(3)}</span>
                  <span>Faltante: {item.faltante.toFixed(3)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 rounded-md border border-orange-300 bg-orange-50 p-3 text-sm text-orange-900">
            <p>El stock quedará negativo. Confirmá que sabés lo que estás haciendo.</p>
            {forceConfirmOpen ? (
              <p className="text-xs font-medium">
                Confirmación final: si continuás, el pedido pasará a producción forzando descuento.
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStockModalOpen(false)}>
              Cancelar
            </Button>
            {forceConfirmOpen ? (
              <Button
                variant="destructive"
                disabled={transitionForcePending}
                onClick={() => void handleForceTransition()}
              >
                {transitionForcePending ? <Loader2 className="animate-spin" /> : null}
                Sí, forzar igual
              </Button>
            ) : (
              <Button variant="destructive" onClick={() => setForceConfirmOpen(true)}>
                Forzar igual
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
