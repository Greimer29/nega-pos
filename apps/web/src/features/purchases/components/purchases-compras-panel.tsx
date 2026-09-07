import { Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AccountSelect } from '@/features/accounts/components/account-select'
import { NuevaPurchaseDialog } from '@/features/purchases/components/new-purchase-dialog'
import { PermissionGate } from '@/features/permissions/components/permission-gate'
import { CreditPurchaseBadge } from '@/features/purchases/components/credit-purchase-badge'
import { PrecioBimonetario } from '@/features/purchases/components/bi-currency-price'
import { PurchaseRowActionsMenu } from '@/features/purchases/components/purchase-row-actions-menu'
import { ESTADO_LABELS, formatFecha } from '@/features/purchases/constants'
import { usePurchasesQuery } from '@/features/purchases/hooks/use-purchases'
import type { PurchaseEstado } from '@/features/purchases/constants'
import { useSuppliersQuery } from '@/features/suppliers/hooks/use-suppliers'
import { QueryErrorState } from '@/features/notifications/query-error-state'
import { cn } from '@/lib/utils'

const PER_PAGE = 20

function EstadoBadge({ status }: { status: PurchaseEstado }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
        status === 'DRAFT'
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
          : status === 'VOIDED'
            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
      )}
    >
      {ESTADO_LABELS[status]}
    </span>
  )
}

export function PurchasesComprasPanel() {
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [accountFilter, setAccountFilter] = useState<number | null>(null)
  const [unassignedOnly, setUnassignedOnly] = useState(false)

  const { data: suppliersData } = useSuppliersQuery({ page: 1, perPage: 100, active: true })
  const { data, isLoading, isError, error, refetch } = usePurchasesQuery({
    page,
    perPage: PER_PAGE,
    account_id: unassignedOnly ? undefined : accountFilter ?? undefined,
    unassigned: unassignedOnly || undefined,
  })

  const purchases = data?.purchases ?? []
  const meta = data?.meta
  const supplierMap = new Map((suppliersData?.suppliers ?? []).map((p) => [p.id, p.name]))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base">Compras realizadas</CardTitle>
          <CardDescription>
            {meta ? `${meta.total} compra${meta.total === 1 ? '' : 's'}` : 'Cargando…'}
          </CardDescription>
        </div>
        <PermissionGate permission="purchases.edit">
          <Button onClick={() => setDialogOpen(true)}>
            <Plus />
            Comprar
          </Button>
        </PermissionGate>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <AccountSelect
            value={unassignedOnly ? null : accountFilter}
            onChange={(value) => {
              setUnassignedOnly(false)
              setAccountFilter(value)
              setPage(1)
            }}
            disabled={unassignedOnly}
            label="Filtrar por cuenta"
          />
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={unassignedOnly}
                onChange={(e) => {
                  setUnassignedOnly(e.target.checked)
                  if (e.target.checked) setAccountFilter(null)
                  setPage(1)
                }}
              />
              Solo sin cuenta
            </label>
          </div>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Cargando compras…
          </div>
        ) : isError ? (
          <QueryErrorState isError error={error} title="No se pudieron cargar las compras" />
        ) : purchases.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No hay compras registradas. Usá &quot;Comprar&quot; para empezar.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b text-left">
                    <th className="px-4 py-3 font-medium">Proveedor</th>
                    <th className="px-4 py-3 font-medium">Cuenta</th>
                    <th className="px-4 py-3 font-medium">Nro. factura</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr
                      key={purchase.id}
                      className="hover:bg-muted/30 border-b last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/purchases/${purchase.id}`}
                          className="font-medium hover:underline"
                        >
                          {purchase.supplierId
                            ? (supplierMap.get(purchase.supplierId) ?? `#${purchase.supplierId}`)
                            : 'Sin proveedor'}
                        </Link>
                      </td>
                      <td className="text-muted-foreground px-4 py-3">
                        {purchase.account?.name ?? '—'}
                      </td>
                      <td className="text-muted-foreground px-4 py-3">
                        {purchase.invoiceNumber ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <PrecioBimonetario
                          precioUsd={purchase.totalUsd}
                          precioBs={purchase.totalBs}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3">{formatFecha(purchase.date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <EstadoBadge status={purchase.status} />
                          {purchase.isCredit && purchase.status === 'CONFIRMED' ? (
                            <CreditPurchaseBadge creditDueDate={purchase.creditDueDate} compact />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <PurchaseRowActionsMenu
                            purchase={purchase}
                            onActionComplete={() => void refetch()}
                          />
                        </div>
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
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= meta.lastPage}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>

      <NuevaPurchaseDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Card>
  )
}
