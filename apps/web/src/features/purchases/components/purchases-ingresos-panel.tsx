import { Loader2, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AccountSelect } from '@/features/accounts/components/account-select'
import { IncomeFormDialog } from '@/features/purchases/components/income-form-dialog'
import { DisplayMoney } from '@/features/currencies/components/display-money'
import { formatFecha } from '@/features/purchases/constants'
import { useIncomesQuery } from '@/features/purchases/hooks/use-incomes'
import type { Income } from '@/features/purchases/types'
import { QueryErrorState } from '@/features/notifications/query-error-state'

const PER_PAGE = 20

export function PurchasesIngresosPanel() {
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null)
  const [accountFilter, setAccountFilter] = useState<number | null>(null)
  const [unassignedOnly, setUnassignedOnly] = useState(false)

  const { data, isLoading, isError, error } = useIncomesQuery({
    page,
    perPage: PER_PAGE,
    account_id: unassignedOnly ? undefined : accountFilter ?? undefined,
    unassigned: unassignedOnly || undefined,
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Ingresos</CardTitle>
          <CardDescription>
            {meta ? `${meta.total} ingreso${meta.total === 1 ? '' : 's'}` : 'Cargando…'}
          </CardDescription>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          Registrar ingreso
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
                        <DisplayMoney
                          amount={income.amount}
                          currencyCode={income.currencyCode}
                          showNative
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(income)}
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

      <IncomeFormDialog open={dialogOpen} onOpenChange={setDialogOpen} income={selectedIncome} />
    </Card>
  )
}
