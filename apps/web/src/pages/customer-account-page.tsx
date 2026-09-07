import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CustomerAccountSummaryCards } from '@/features/customers/components/customer-account-summary-cards'
import { CustomerPaymentFormDialog } from '@/features/customers/components/customer-payment-form-dialog'
import { useCustomerAccountStatementQuery } from '@/features/customers/hooks/use-customers'
import { computeCustomerAccountSummary } from '@/features/customers/utils/customer-account-summary'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { CreditPurchaseBadge } from '@/features/purchases/components/credit-purchase-badge'
import { detailPageErrorMessage } from '@/lib/detail-page-messages'
import { parsePositiveIntRouteParam } from '@/lib/route-id'
import { cn } from '@/lib/utils'

function formatFecha(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('es-VE')
}

function creditEstado(creditDueDate: string | null, balanceUsd: string) {
  if (Number(balanceUsd) <= 0) return { label: 'Pagada', className: 'bg-emerald-100 text-emerald-800' }
  if (!creditDueDate) return { label: 'Vigente', className: 'bg-amber-100 text-amber-800' }
  const today = new Date().toISOString().slice(0, 10)
  if (creditDueDate < today) return { label: 'Vencida', className: 'bg-red-100 text-red-800' }
  return { label: 'Vigente', className: 'bg-amber-100 text-amber-800' }
}

export function CustomerAccountPage() {
  const { id } = useParams<{ id: string }>()
  const { id: customerId, isValid: isValidCustomerId } = parsePositiveIntRouteParam(id)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentSaleId, setPaymentSaleId] = useState<number | undefined>()
  const [paymentMaxUsd, setPaymentMaxUsd] = useState<number | undefined>()

  const { data, isLoading, isError, error, refetch } = useCustomerAccountStatementQuery(customerId)

  const summary = useMemo(
    () => (data ? computeCustomerAccountSummary(data.sales, data.payments) : null),
    [data]
  )

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
          <Link to="/customers">Volver a clientes</Link>
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
        <p className={cn('text-sm whitespace-pre-line', isError ? 'text-destructive' : 'text-muted-foreground')}>
          {detailPageErrorMessage({
            isValidId: true,
            isError,
            error,
            entityLabel: 'estado de cuenta',
          })}
        </p>
        <Button variant="outline" asChild>
          <Link to="/customers">Volver a clientes</Link>
        </Button>
      </div>
    )
  }

  const { customer, sales, payments } = data

  function openPayment(saleId?: number, maxUsd?: number) {
    setPaymentSaleId(saleId)
    setPaymentMaxUsd(maxUsd)
    setPaymentDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
            <Link to="/customers">
              <ArrowLeft />
              Clientes
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Estado de cuenta</h1>
          <p className="text-muted-foreground text-sm">{customer.name}</p>
          {(customer.creditDays ?? 0) > 0 ? (
            <p className="text-muted-foreground text-xs">
              Plazo de crédito: {customer.creditDays} días
            </p>
          ) : null}
        </div>
        <Button onClick={() => openPayment()}>
          <Plus />
          Registrar abono
        </Button>
      </div>

      <CustomerAccountSummaryCards summary={summary!} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de ventas</CardTitle>
          <CardDescription>
            Borradores, confirmados, cancelados y ventas a crédito o contado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay ventas registradas.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b text-left">
                    <th className="px-4 py-3 font-medium">Pedido</th>
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
                  {sales.map((sale) => {
                    const isCreditBillable =
                      sale.paymentType === 'CREDIT' && sale.status === 'COMPLETED'
                    const creditStatus = isCreditBillable
                      ? creditEstado(sale.creditDueDate, sale.balanceUsd)
                      : null
                    const balance = Number(sale.balanceUsd)
                    const canPay = isCreditBillable && balance > 0

                    return (
                      <tr key={sale.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3 font-medium">
                          <Link to={`/ventas/${sale.id}`} className="hover:underline">
                            {sale.code ?? `#${sale.id}`}
                          </Link>
                        </td>
                        <td className="text-muted-foreground px-4 py-3">
                          {sale.soldAt ? formatFecha(sale.soldAt) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs">{sale.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          {sale.paymentType === 'CREDIT' ? (
                            <CreditPurchaseBadge
                              creditDueDate={sale.creditDueDate}
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
                          {sale.paymentType === 'CREDIT' ? formatFecha(sale.creditDueDate) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DisplayMoneyFromUsd amountUsd={sale.totalUsd} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {sale.paymentType === 'CREDIT' ? (
                            <DisplayMoneyFromUsd amountUsd={sale.balanceUsd} size="sm" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canPay ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPayment(sale.id, balance)}
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
                    <th className="px-4 py-3 font-medium">Pedido</th>
                    <th className="px-4 py-3 text-right font-medium">Monto</th>
                    <th className="px-4 py-3 font-medium">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const linkedSale = payment.saleId
                      ? sales.find((sale) => sale.id === payment.saleId)
                      : null

                    return (
                      <tr key={payment.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3">{formatFecha(payment.date)}</td>
                        <td className="px-4 py-3">
                          {payment.saleId ? (
                            <Link to={`/ventas/${payment.saleId}`} className="hover:underline">
                              {linkedSale?.code ?? `#${payment.saleId}`}
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
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerPaymentFormDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        customerId={customerId}
        saleId={paymentSaleId}
        maxAmountUsd={paymentMaxUsd}
        onSuccess={() => void refetch()}
      />
    </div>
  )
}
