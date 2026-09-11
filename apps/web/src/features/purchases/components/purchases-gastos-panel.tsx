import { Loader2, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AccountSelect } from '@/features/accounts/components/account-select'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { ExpenseFormDialog } from '@/features/purchases/components/expense-form-dialog'
import { DisplayDocumentMoney } from '@/features/currencies/components/display-money'
import { formatFecha } from '@/features/purchases/constants'
import { useExpensesQuery } from '@/features/purchases/hooks/use-expenses'
import type { Expense } from '@/features/purchases/types'
import { QueryErrorState } from '@/features/notifications/query-error-state'
import { sessionFilterKey, useSessionPersistedState } from '@/lib/session-persisted-state'
import { toolbarHeaderClass } from '@/components/layout/responsive-toolbar'

const PER_PAGE = 20

type PurchasesGastosFilters = {
  accountId: number | null
  unassignedOnly: boolean
  page: number
}

const DEFAULT_PURCHASES_GASTOS_FILTERS: PurchasesGastosFilters = {
  accountId: null,
  unassignedOnly: false,
  page: 1,
}

export function PurchasesGastosPanel() {
  const { company } = useAuth()
  const [filters, setFilters] = useSessionPersistedState(
    sessionFilterKey('purchases-gastos', company?.id),
    DEFAULT_PURCHASES_GASTOS_FILTERS
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)

  const { data, isLoading, isError, error } = useExpensesQuery({
    page: filters.page,
    perPage: PER_PAGE,
    account_id: filters.unassignedOnly ? undefined : filters.accountId ?? undefined,
    unassigned: filters.unassignedOnly || undefined,
  })

  const expenses = data?.expenses ?? []
  const meta = data?.meta

  function openCreate() {
    setSelectedExpense(null)
    setDialogOpen(true)
  }

  function openEdit(expense: Expense) {
    setSelectedExpense(expense)
    setDialogOpen(true)
  }

  return (
    <Card>
      <CardHeader className={toolbarHeaderClass}>
        <div>
          <CardTitle className="text-base">Gastos</CardTitle>
          {!meta ? <CardDescription>Cargando…</CardDescription> : null}
        </div>
        <Button onClick={openCreate}>
          <Plus />
          Registrar gasto
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
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
            Cargando gastos…
          </div>
        ) : isError ? (
          <QueryErrorState isError error={error} title="No se pudieron cargar los gastos" />
        ) : expenses.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">No hay gastos registrados.</p>
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
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3">{formatFecha(expense.date)}</td>
                      <td className="px-4 py-3">{expense.description}</td>
                      <td className="text-muted-foreground px-4 py-3">
                        {expense.account?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DisplayDocumentMoney
                          amountUsd={expense.amountUsd}
                          amountNative={expense.amount}
                          currencyCode={expense.currencyCode}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(expense)}
                        >
                          <Pencil className="size-4" />
                        </Button>
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

      <ExpenseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={selectedExpense}
      />
    </Card>
  )
}
