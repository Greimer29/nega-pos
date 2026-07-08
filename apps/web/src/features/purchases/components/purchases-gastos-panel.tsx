import { Loader2, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AccountSelect } from '@/features/accounts/components/account-select'
import { ExpenseFormDialog } from '@/features/purchases/components/expense-form-dialog'
import { DisplayMoney } from '@/features/currencies/components/display-money'
import { formatFecha } from '@/features/purchases/constants'
import { useExpensesQuery } from '@/features/purchases/hooks/use-expenses'
import type { Expense } from '@/features/purchases/types'
import { getApiErrorMessage } from '@/lib/api-error'

const PER_PAGE = 20

export function PurchasesGastosPanel() {
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [accountFilter, setAccountFilter] = useState<number | null>(null)
  const [unassignedOnly, setUnassignedOnly] = useState(false)

  const { data, isLoading, isError, error } = useExpensesQuery({
    page,
    perPage: PER_PAGE,
    account_id: unassignedOnly ? undefined : accountFilter ?? undefined,
    unassigned: unassignedOnly || undefined,
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
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Gastos de empresa</CardTitle>
          <CardDescription>
            {meta ? `${meta.total} gasto${meta.total === 1 ? '' : 's'}` : 'Cargando…'}
          </CardDescription>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          Registrar gasto
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
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
            Cargando gastos…
          </div>
        ) : isError ? (
          <p className="text-destructive text-sm whitespace-pre-line">{getApiErrorMessage(error)}</p>
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
                        <DisplayMoney
                          amount={expense.amount}
                          currencyCode={expense.currencyCode}
                          showNative
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

            {meta && meta.lastPage > 1 ? (
              <div className="flex items-center justify-between">
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

      <ExpenseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={selectedExpense}
      />
    </Card>
  )
}
