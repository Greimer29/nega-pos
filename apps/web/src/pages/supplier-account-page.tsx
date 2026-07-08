import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { CreditPurchaseBadge } from '@/features/purchases/components/credit-purchase-badge'
import { PurchasePaymentFormDialog } from '@/features/purchases/components/purchase-payment-form-dialog'
import { ESTADO_LABELS, formatFecha, type PurchaseEstado } from '@/features/purchases/constants'
import { SupplierAccountSummaryCards } from '@/features/suppliers/components/supplier-account-summary-cards'
import { useSupplierAccountStatementQuery } from '@/features/suppliers/hooks/use-suppliers'
import { computeSupplierAccountSummary } from '@/features/suppliers/utils/supplier-account-summary'
import { detailPageErrorMessage } from '@/lib/detail-page-messages'
import { parsePositiveIntRouteParam } from '@/lib/route-id'
import { cn } from '@/lib/utils'

function purchaseStatusBadge(status: string) {
  const purchaseStatus = status as PurchaseEstado
  const label = ESTADO_LABELS[purchaseStatus] ?? status

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
        purchaseStatus === 'DRAFT'
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
          : purchaseStatus === 'VOIDED'
            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
      )}
    >
      {label}
    </span>
  )
}

function creditEstado(creditDueDate: string | null, balanceUsd: string) {
  if (Number(balanceUsd) <= 0) return { label: 'Pagada', className: 'bg-emerald-100 text-emerald-800' }
  if (!creditDueDate) return { label: 'Vigente', className: 'bg-amber-100 text-amber-800' }
  const today = new Date().toISOString().slice(0, 10)
  if (creditDueDate < today) return { label: 'Vencida', className: 'bg-red-100 text-red-800' }
  return { label: 'Vigente', className: 'bg-amber-100 text-amber-800' }
}

export function SupplierAccountPage() {
  const { id } = useParams<{ id: string }>()
  const { id: supplierId, isValid: isValidSupplierId } = parsePositiveIntRouteParam(id)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentPurchaseId, setPaymentPurchaseId] = useState<number | undefined>()
  const [paymentMaxUsd, setPaymentMaxUsd] = useState<number | undefined>()

  const { data, isLoading, isError, error, refetch } = useSupplierAccountStatementQuery(supplierId)

  const summary = useMemo(
    () =>
      data
        ? computeSupplierAccountSummary(data.purchases, data.payments)
        : null,
    [data]
  )

  if (!isValidSupplierId) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-destructive text-sm">
          {detailPageErrorMessage({
            isValidId: false,
            isError: false,
            error: null,
            entityLabel: 'proveedor',
          })}
        </p>
        <Button variant="outline" asChild>
          <Link to="/suppliers">Volver a proveedores</Link>
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-24 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Cargando estado de cuenta…
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-destructive text-sm whitespace-pre-line">
          {detailPageErrorMessage({
            isValidId: true,
            isError,
            error,
            entityLabel: 'estado de cuenta',
          })}
        </p>
        <Button variant="outline" asChild>
          <Link to="/suppliers">Volver a proveedores</Link>
        </Button>
      </div>
    )
  }

  const { supplier, purchases, payments } = data

  function openPayment(purchaseId?: number, maxUsd?: number) {
    setPaymentPurchaseId(purchaseId)
    setPaymentMaxUsd(maxUsd)
    setPaymentDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
            <Link to="/suppliers">
              <ArrowLeft />
              Proveedores
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Estado de cuenta</h1>
          <p className="text-muted-foreground text-sm">{supplier.name}</p>
          {supplier.creditDays ? (
            <p className="text-muted-foreground text-xs">
              Plazo de crédito: {supplier.creditDays} días
            </p>
          ) : null}
        </div>
        <Button onClick={() => openPayment()}>
          <Plus />
          Registrar abono
        </Button>
      </div>

      <SupplierAccountSummaryCards summary={summary!} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de compras</CardTitle>
          <CardDescription>
            Borradores, confirmadas, anuladas y compras a crédito o contado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay compras registradas.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b text-left">
                    <th className="px-4 py-3 font-medium">Compra</th>
                    <th className="px-4 py-3 font-medium">Factura</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Pago</th>
                    <th className="px-4 py-3 font-medium">Vencimiento</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-right font-medium">Saldo</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => {
                    const isCreditConfirmed =
                      purchase.isCredit && purchase.status === 'CONFIRMED'
                    const creditStatus = isCreditConfirmed
                      ? creditEstado(purchase.creditDueDate, purchase.balanceUsd)
                      : null
                    const balance = Number(purchase.balanceUsd)
                    const canPay = isCreditConfirmed && balance > 0

                    return (
                      <tr key={purchase.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3 font-medium">
                          <Link to={`/purchases/${purchase.id}`} className="hover:underline">
                            #{purchase.id}
                          </Link>
                        </td>
                        <td className="text-muted-foreground px-4 py-3">
                          {purchase.invoiceNumber ?? '—'}
                        </td>
                        <td className="text-muted-foreground px-4 py-3">
                          {formatFecha(purchase.date)}
                        </td>
                        <td className="px-4 py-3">{purchaseStatusBadge(purchase.status)}</td>
                        <td className="px-4 py-3">
                          {purchase.isCredit ? (
                            <CreditPurchaseBadge
                              creditDueDate={purchase.creditDueDate}
                              reportStatus={
                                creditStatus?.label === 'Vencida'
                                  ? 'overdue'
                                  : creditStatus?.label === 'Pagada'
                                    ? 'settled'
                                    : creditStatus
                                      ? 'pending'
                                      : undefined
                              }
                              compact
                            />
                          ) : (
                            <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                              Contado
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {purchase.isCredit ? formatFecha(purchase.creditDueDate) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DisplayMoneyFromUsd amountUsd={purchase.totalUsd} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {purchase.isCredit ? (
                            <DisplayMoneyFromUsd amountUsd={purchase.balanceUsd} size="sm" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canPay ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPayment(purchase.id, balance)}
                            >
                              Abonar
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Abonos registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay abonos registrados.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b text-left">
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Compra</th>
                    <th className="px-4 py-3 text-right font-medium">Monto</th>
                    <th className="px-4 py-3 font-medium">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3">{formatFecha(payment.date)}</td>
                      <td className="px-4 py-3">
                        {payment.purchaseId ? (
                          <Link to={`/purchases/${payment.purchaseId}`} className="hover:underline">
                            #{payment.purchaseId}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DisplayMoneyFromUsd amountUsd={payment.amountUsd} size="sm" />
                      </td>
                      <td className="text-muted-foreground px-4 py-3">{payment.note ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <PurchasePaymentFormDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        supplierId={supplierId}
        purchaseId={paymentPurchaseId}
        maxAmountUsd={paymentMaxUsd}
        onSuccess={() => void refetch()}
      />
    </div>
  )
}
