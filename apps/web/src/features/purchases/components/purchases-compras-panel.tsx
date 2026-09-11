import { Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AccountSelect } from '@/features/accounts/components/account-select'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { NuevaPurchaseDialog } from '@/features/purchases/components/new-purchase-dialog'
import { PermissionGate } from '@/features/permissions/components/permission-gate'
import { PrecioBimonetario } from '@/features/purchases/components/bi-currency-price'
import { PurchaseRowActionsMenu } from '@/features/purchases/components/purchase-row-actions-menu'
import { formatFecha } from '@/features/purchases/constants'
import { usePurchasesQuery } from '@/features/purchases/hooks/use-purchases'
import {
  PURCHASE_STATUS_LEGEND,
  purchaseStatusToneClass,
  resolvePurchaseStatusBadges,
} from '@/features/purchases/utils/purchase-status-badges'
import { useSuppliersQuery } from '@/features/suppliers/hooks/use-suppliers'
import { QueryErrorState, EmptyListState } from '@/features/notifications/query-error-state'
import { sessionFilterKey, useSessionPersistedState } from '@/lib/session-persisted-state'
import { toolbarHeaderClass } from '@/components/layout/responsive-toolbar'
import { cn } from '@/lib/utils'

const PER_PAGE = 20

type PurchasesComprasFilters = {
  accountId: number | null
  unassignedOnly: boolean
  page: number
}

const DEFAULT_PURCHASES_COMPRAS_FILTERS: PurchasesComprasFilters = {
  accountId: null,
  unassignedOnly: false,
  page: 1,
}

function PurchaseEstadoBadges({
  status,
  isCredit,
  balanceUsd,
  creditDueDate,
}: {
  status: Parameters<typeof resolvePurchaseStatusBadges>[0]['status']
  isCredit: boolean
  balanceUsd?: string | number | null
  creditDueDate?: string | null
}) {
  const badges = resolvePurchaseStatusBadges({ status, isCredit, balanceUsd, creditDueDate })

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {badges.map((badge) => (
        <span
          key={badge.tone}
          title={badge.label}
          aria-label={badge.label}
          className={cn('inline-block size-3 rounded-full', purchaseStatusToneClass(badge.tone))}
        />
      ))}
    </div>
  )
}

export function PurchasesComprasPanel() {
  const { company } = useAuth()
  const [filters, setFilters] = useSessionPersistedState(
    sessionFilterKey('purchases-compras', company?.id),
    DEFAULT_PURCHASES_COMPRAS_FILTERS
  )
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: suppliersData } = useSuppliersQuery({ page: 1, perPage: 100, active: true })
  const { data, isLoading, isError, error, refetch } = usePurchasesQuery({
    page: filters.page,
    perPage: PER_PAGE,
    account_id: filters.unassignedOnly ? undefined : filters.accountId ?? undefined,
    unassigned: filters.unassignedOnly || undefined,
  })

  const purchases = data?.purchases ?? []
  const meta = data?.meta
  const supplierMap = new Map((suppliersData?.suppliers ?? []).map((p) => [p.id, p.name]))

  return (
    <Card>
      <CardHeader className={toolbarHeaderClass}>
        <div>
          <CardTitle className="text-base">Compras realizadas</CardTitle>
          {!meta ? <CardDescription>Cargando…</CardDescription> : null}
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
            value={filters.unassignedOnly ? null : filters.accountId}
            onChange={(value) => {
              setFilters((prev) => ({
                ...prev,
                unassignedOnly: false,
                accountId: value,
                page: 1,
              }))
            }}
            disabled={filters.unassignedOnly}
            label="Filtrar por cuenta"
          />
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.unassignedOnly}
                onChange={(e) => {
                  const checked = e.target.checked
                  setFilters((prev) => ({
                    ...prev,
                    unassignedOnly: checked,
                    accountId: checked ? null : prev.accountId,
                    page: 1,
                  }))
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
          <EmptyListState
            title="Todavía no hay compras"
            description='Es normal en una empresa nueva. Usá "Comprar" para registrar la primera.'
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b text-left">
                    <th className="px-4 py-3 font-medium">Proveedor</th>
                    <th className="px-4 py-3 font-medium">Cuenta</th>
                    <th className="px-4 py-3 font-medium">Nro. factura</th>
                    <th className="min-w-[9rem] px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="w-px px-2 py-3 font-medium whitespace-nowrap">Estado</th>
                    <th className="w-px px-2 py-3 text-right font-medium whitespace-nowrap">Acciones</th>
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
                      <td className="min-w-[9rem] px-4 py-3">
                        <PrecioBimonetario
                          precioUsd={purchase.totalUsd}
                          precioBs={purchase.totalBs}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatFecha(purchase.date)}</td>
                      <td className="w-px px-2 py-3">
                        <PurchaseEstadoBadges
                          status={purchase.status}
                          isCredit={purchase.isCredit}
                          balanceUsd={purchase.balanceUsd}
                          creditDueDate={purchase.creditDueDate}
                        />
                      </td>
                      <td className="w-px px-2 py-3 text-right">
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

            {meta ? (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <p className="text-muted-foreground text-sm">
                    Mostrando {(meta.currentPage - 1) * meta.perPage + 1}–
                    {Math.min(meta.currentPage * meta.perPage, meta.total)} de {meta.total}
                    {meta.lastPage > 1 ? ` · Página ${meta.currentPage} de ${meta.lastPage}` : ''}
                  </p>
                  <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    {PURCHASE_STATUS_LEGEND.map((item) => (
                      <li key={item.tone} className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <span
                          className={cn(
                            'inline-block size-2.5 shrink-0 rounded-full',
                            purchaseStatusToneClass(item.tone)
                          )}
                          aria-hidden
                        />
                        {item.label}
                      </li>
                    ))}
                  </ul>
                </div>
                {meta.lastPage > 1 ? (
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
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </CardContent>

      <NuevaPurchaseDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Card>
  )
}
