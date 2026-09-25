import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { AccountListFiltersPanel } from '@/components/filters/account-list-filters-panel'
import { FiltersDrawer } from '@/components/filters/filters-drawer'
import { FiltersIconButton } from '@/components/filters/filters-icon-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { IncomeFormDialog } from '@/features/purchases/components/income-form-dialog'
import { DisplayDocumentMoney } from '@/features/currencies/components/display-money'
import { formatFecha } from '@/features/purchases/constants'
import { useDeleteIncomeMutation, useIncomesQuery } from '@/features/purchases/hooks/use-incomes'
import type { Income } from '@/features/purchases/types'
import { PermissionGate } from '@/features/permissions/components/permission-gate'
import { notifyApiError, QueryErrorState } from '@/features/notifications/query-error-state'
import { sessionFilterKey, useSessionPersistedState } from '@/lib/session-persisted-state'
import { toolbarHeaderClass } from '@/components/layout/responsive-toolbar'

const PER_PAGE = 20

type PurchasesIngresosFilters = {
  accountId: number | null
  unassignedOnly: boolean
  page: number
}

const DEFAULT_PURCHASES_INGRESOS_FILTERS: PurchasesIngresosFilters = {
  accountId: null,
  unassignedOnly: false,
  page: 1,
}

export function PurchasesIngresosPanel() {
  const { company } = useAuth()
  const [filters, setFilters] = useSessionPersistedState(
    sessionFilterKey('purchases-ingresos', company?.id),
    DEFAULT_PURCHASES_INGRESOS_FILTERS
  )
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null)
  const deleteMutation = useDeleteIncomeMutation()

  const { data, isLoading, isError, error } = useIncomesQuery({
    page: filters.page,
    perPage: PER_PAGE,
    account_id: filters.unassignedOnly ? undefined : (filters.accountId ?? undefined),
    unassigned: filters.unassignedOnly || undefined,
  })

  const incomes = data?.incomes ?? []
  const meta = data?.meta

  function openCreate() {
    setSelectedIncome(null)
    setDialogOpen(true)
  }

  function openEdit(income: Income) {
    setSelectedIncome(income)
    setDialogOpen(true)
  }

  async function handleDelete(income: Income) {
    if (!window.confirm(`¿Eliminar el ingreso «${income.description}»? No se podrá recuperar.`)) {
      return
    }
    try {
      await deleteMutation.mutateAsync(income.id)
      if (incomes.length === 1 && filters.page > 1) {
        setFilters((prev) => ({ ...prev, page: prev.page - 1 }))
      }
    } catch (err) {
      notifyApiError(err, 'No se pudo eliminar el ingreso')
    }
  }

  return (
    <Card>
      <CardHeader className={toolbarHeaderClass}>
        <div>
          <CardTitle className="text-base">Ingresos</CardTitle>
          {!meta ? <CardDescription>Cargando…</CardDescription> : null}
        </div>
        <div className="flex items-center gap-2">
          <FiltersIconButton
            count={(filters.accountId != null ? 1 : 0) + (filters.unassignedOnly ? 1 : 0)}
            expanded={filtersOpen}
            controls="purchases-ingresos-filters"
            onClick={() => setFiltersOpen(true)}
          />
          <Button onClick={openCreate}>
            <Plus />
            Registrar ingreso
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <FiltersDrawer
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          id="purchases-ingresos-filters"
          title="Filtros de ingresos"
          description="Cuenta asociada a los ingresos."
        >
          <AccountListFiltersPanel
            accountId={filters.accountId}
            unassignedOnly={filters.unassignedOnly}
            onAccountIdChange={(accountId) =>
              setFilters((prev) => ({ ...prev, accountId, page: 1 }))
            }
            onUnassignedOnlyChange={(unassignedOnly) =>
              setFilters((prev) => ({
                ...prev,
                unassignedOnly,
                accountId: unassignedOnly ? null : prev.accountId,
                page: 1,
              }))
            }
            onClearAll={() =>
              setFilters((prev) => ({ ...prev, accountId: null, unassignedOnly: false, page: 1 }))
            }
          />
        </FiltersDrawer>

        {isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Cargando ingresos…
          </div>
        ) : isError ? (
          <QueryErrorState isError error={error} title="No se pudieron cargar los ingresos" />
        ) : incomes.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No hay ingresos registrados.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b text-left">
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Descripción</th>
                    <th className="px-4 py-3 font-medium">Cuenta</th>
                    <th className="px-4 py-3 font-medium text-right">Monto</th>
                    <th className="px-4 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {incomes.map((income) => (
                    <tr key={income.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3">{formatFecha(income.date)}</td>
                      <td className="px-4 py-3">{income.description}</td>
                      <td className="text-muted-foreground px-4 py-3">
                        {income.account?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DisplayDocumentMoney
                          amountUsd={income.amountUsd}
                          amountNative={income.amount}
                          currencyCode={income.currencyCode}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar ${income.description}`}
                            onClick={() => openEdit(income)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <PermissionGate permission="incomes.edit">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Eliminar ingreso"
                              aria-label={`Eliminar ${income.description}`}
                              className="text-destructive hover:text-destructive"
                              disabled={deleteMutation.isPending}
                              onClick={() => void handleDelete(income)}
                            >
                              {deleteMutation.isPending &&
                              deleteMutation.variables === income.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </Button>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta ? (
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                  Mostrando {(meta.currentPage - 1) * meta.perPage + 1}–
                  {Math.min(meta.currentPage * meta.perPage, meta.total)} de {meta.total}
                  {meta.lastPage > 1 ? ` · Página ${meta.currentPage} de ${meta.lastPage}` : ''}
                </p>
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

      <IncomeFormDialog open={dialogOpen} onOpenChange={setDialogOpen} income={selectedIncome} />
    </Card>
  )
}
