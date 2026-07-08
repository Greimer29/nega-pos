import { ArrowLeft, Loader2, Printer, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import {
  useConfirmSaleMutation,
  useSaleQuery,
  useTransitionSaleMutation,
} from '@/features/ventas/hooks/use-sales'
import { VentasOrderReturnDialog } from '@/features/ventas/components/ventas-order-return-dialog'
import { SALE_ORDER_STATUS_LABELS, paymentMethodLabel } from '@/features/ventas/constants'
import type { SaleOrderStatus } from '@/features/ventas/types'
import { detailPageErrorMessage } from '@/lib/detail-page-messages'
import { getApiErrorMessage } from '@/lib/api-error'
import { parsePositiveIntRouteParam } from '@/lib/route-id'
import {
  formatPrintErrors,
  isPrintingAvailable,
  printSaleDocumentsOnConfirm,
  reprintSaleDocument,
} from '@/features/printing/services/printing-service'
import { getSale } from '@/features/ventas/services/sales-service'

const ORDER_TRANSITIONS: Record<SaleOrderStatus, SaleOrderStatus[]> = {
  PENDING: ['IN_PROCESS', 'DELIVERED'],
  IN_PROCESS: ['DELIVERED'],
  DELIVERED: [],
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('es-VE')
}

export function SaleDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { id: saleId, isValid: isValidSaleId } = parsePositiveIntRouteParam(id)
  const { data: sale, isLoading, isError, error, refetch } = useSaleQuery(
    isValidSaleId ? saleId : undefined
  )
  const transitionMutation = useTransitionSaleMutation()
  const confirmMutation = useConfirmSaleMutation()
  const [returnOpen, setReturnOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [printNotice, setPrintNotice] = useState<string | null>(
    (location.state as { printNotice?: string } | null)?.printNotice ?? null
  )
  const [reprintingKind, setReprintingKind] = useState<'invoice' | 'deliveryNote' | null>(null)
  const printingAvailable = isPrintingAvailable()

  if (!isValidSaleId) {
    return (
      <div className="space-y-4 py-8">
        <Button variant="ghost" asChild>
          <Link to="/ventas">
            <ArrowLeft className="mr-2 size-4" />
            Ventas
          </Link>
        </Button>
        <p className="text-destructive text-sm">
          {detailPageErrorMessage({
            isValidId: false,
            isError: false,
            error: null,
            entityLabel: 'factura',
          })}
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-16">
        <Loader2 className="size-5 animate-spin" />
        Cargando factura…
      </div>
    )
  }

  if (isError || !sale) {
    return (
      <div className="space-y-4 py-8">
        <Button variant="ghost" asChild>
          <Link to="/ventas">
            <ArrowLeft className="mr-2 size-4" />
            Ventas
          </Link>
        </Button>
        <p className="text-destructive text-sm">{getApiErrorMessage(error)}</p>
      </div>
    )
  }

  const clientLabel = sale.customer?.name ?? sale.guest_name ?? 'Sin cliente'
  const lines = sale.lines ?? []
  const nextStatuses = sale.billing_mode === 'ORDER' ? ORDER_TRANSITIONS[sale.order_status] : []

  async function handleTransition(orderStatus: SaleOrderStatus) {
    setActionError(null)
    try {
      await transitionMutation.mutateAsync({ id: saleId, orderStatus })
      void refetch()
    } catch (err) {
      setActionError(getApiErrorMessage(err))
    }
  }

  async function handleConfirmDraft() {
    setActionError(null)
    try {
      const confirmed = await confirmMutation.mutateAsync({ id: saleId })
      if (printingAvailable) {
        try {
          const fullSale = await getSale(confirmed.id)
          const printResult = await printSaleDocumentsOnConfirm(fullSale)
          void navigate(`/ventas/${confirmed.id}`, {
            replace: true,
            state:
              printResult.errors.length > 0
                ? { printNotice: formatPrintErrors(printResult.errors) }
                : undefined,
          })
          return
        } catch (printError) {
          void navigate(`/ventas/${confirmed.id}`, {
            replace: true,
            state: { printNotice: getApiErrorMessage(printError) },
          })
          return
        }
      }
      void navigate(`/ventas/${confirmed.id}`, { replace: true })
    } catch (err) {
      setActionError(getApiErrorMessage(err))
    }
  }

  async function handleReprint(kind: 'invoice' | 'deliveryNote') {
    if (!sale) return
    setReprintingKind(kind)
    setPrintNotice(null)
    setActionError(null)
    try {
      const result = await reprintSaleDocument(sale, kind)
      if (result.errors.length > 0) {
        setPrintNotice(formatPrintErrors(result.errors))
      }
    } catch (err) {
      setPrintNotice(getApiErrorMessage(err))
    } finally {
      setReprintingKind(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link to="/ventas">
              <ArrowLeft className="mr-2 size-4" />
              Ventas
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            Factura {sale.code ?? `#${sale.id}`}
          </h1>
          <p className="text-muted-foreground text-sm">Cliente: {clientLabel}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {sale.status === 'DRAFT' ? (
            <Button disabled={confirmMutation.isPending} onClick={() => void handleConfirmDraft()}>
              {confirmMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmar factura
            </Button>
          ) : null}
          {sale.status === 'COMPLETED' && printingAvailable ? (
            <Button
              variant="outline"
              disabled={reprintingKind !== null}
              onClick={() => void handleReprint('invoice')}
            >
              {reprintingKind === 'invoice' ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Printer className="mr-2 size-4" />
              )}
              Reimprimir recibo
            </Button>
          ) : null}
          {sale.status === 'COMPLETED' && printingAvailable ? (
            <Button
              variant="outline"
              disabled={reprintingKind !== null}
              onClick={() => void handleReprint('deliveryNote')}
            >
              {reprintingKind === 'deliveryNote' ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Printer className="mr-2 size-4" />
              )}
              Reimprimir nota de despacho
            </Button>
          ) : null}
          {sale.status === 'COMPLETED' ? (
            <Button variant="outline" onClick={() => setReturnOpen(true)}>
              <RotateCcw className="mr-2 size-4" />
              Devolución
            </Button>
          ) : null}
        </div>
      </div>

      {actionError ? (
        <p className="text-destructive text-sm whitespace-pre-line">{actionError}</p>
      ) : null}
      {printNotice ? (
        <p className="text-amber-800 text-sm whitespace-pre-line">{printNotice}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de la factura</CardTitle>
          <CardDescription>
            {sale.status === 'DRAFT' ? 'Borrador — aún no confirmada' : 'Solo lectura'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs">Fecha</p>
            <p className="text-sm">{formatDate(sale.sold_at ?? sale.confirmed_at)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Modalidad</p>
            <p className="text-sm">{sale.billing_mode === 'ORDER' ? 'Pedido' : 'Rápida'}</p>
          </div>
          {sale.billing_mode === 'ORDER' ? (
            <div>
              <p className="text-muted-foreground text-xs">Estado del pedido</p>
              <p className="text-sm">{SALE_ORDER_STATUS_LABELS[sale.order_status]}</p>
            </div>
          ) : null}
          <div>
            <p className="text-muted-foreground text-xs">Pago</p>
            <p className="text-sm">
              {sale.payment_type === 'CREDIT'
                ? `Crédito · Saldo ${sale.balance_usd} USD`
                : paymentMethodLabel(sale.payment_method) || 'Contado'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Total</p>
            <p className="text-sm font-medium">
              <DisplayMoneyFromUsd amountUsd={sale.total_usd} />
            </p>
          </div>
        </CardContent>
      </Card>

      {nextStatuses.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Avanzar pedido</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {nextStatuses.map((status) => (
              <Button
                key={status}
                variant="outline"
                disabled={transitionMutation.isPending}
                onClick={() => void handleTransition(status)}
              >
                Marcar como {SALE_ORDER_STATUS_LABELS[status]}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-muted/40">
                <tr className="border-b text-left">
                  <th className="px-3 py-2 font-medium">Producto</th>
                  <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                  <th className="px-3 py-2 text-right font-medium">P. unit.</th>
                  <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const qty =
                    Number(line.quantity) - Number(line.returned_quantity ?? 0)
                  return (
                    <tr key={line.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{line.description}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{qty}</td>
                      <td className="px-3 py-2 text-right">
                        <DisplayMoneyFromUsd amountUsd={line.unit_price_usd} size="sm" />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <DisplayMoneyFromUsd
                          amountUsd={qty * Number(line.unit_price_usd)}
                          size="sm"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <VentasOrderReturnDialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        saleId={sale.id}
        onSuccess={() => void refetch()}
      />
    </div>
  )
}

export { SaleDetailPage as OrderDetallePage }
