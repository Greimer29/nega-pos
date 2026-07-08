import { ArrowLeft, Loader2, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MachineExpenseFormDialog } from '@/features/machines/components/machine-expense-form-dialog'
import { MachineFormDialog } from '@/features/machines/components/machine-form-dialog'
import {
  MACHINE_EXPENSE_CATEGORY_LABELS,
  MACHINE_STATUS_LABELS,
  formatDate,
  formatMachineTypeLabel,
} from '@/features/machines/constants'
import { useMachineQuery } from '@/features/machines/hooks/use-machines'
import { AccountSelect } from '@/features/accounts/components/account-select'
import { DisplayMoney } from '@/features/currencies/components/display-money'
import { detailPageErrorMessage } from '@/lib/detail-page-messages'
import { parsePositiveIntRouteParam } from '@/lib/route-id'

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString('es-VE', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function MachineDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { id: machineId, isValid: isValidMachineId } = parsePositiveIntRouteParam(id)
  const [editOpen, setEditOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [accountFilter, setAccountFilter] = useState<number | null>(null)
  const [unassignedOnly, setUnassignedOnly] = useState(false)

  const { data: machine, isLoading, isError, error } = useMachineQuery(machineId)

  if (!isValidMachineId) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-destructive text-sm">
          {detailPageErrorMessage({
            isValidId: false,
            isError: false,
            error: null,
            entityLabel: 'máquina',
          })}
        </p>
        <Button variant="outline" asChild>
          <Link to="/machines">Volver al listado</Link>
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-24 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Cargando máquina…
      </div>
    )
  }

  if (isError || !machine) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-destructive text-sm whitespace-pre-line">
          {detailPageErrorMessage({
            isValidId: true,
            isError,
            error,
            entityLabel: 'máquina',
          })}
        </p>
        <Button variant="outline" asChild>
          <Link to="/machines">Volver al listado</Link>
        </Button>
      </div>
    )
  }

  const expenses = (machine.expenses ?? []).filter((expense) => {
    if (unassignedOnly) return expense.accountId == null
    if (accountFilter != null) return expense.accountId === accountFilter
    return true
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
            <Link to="/machines">
              <ArrowLeft />
              Máquinas
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{machine.name}</h1>
            <span className="bg-muted text-muted-foreground inline-flex rounded-full px-2 py-0.5 text-xs font-medium">
              {formatMachineTypeLabel(machine.type)}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            Estado: {MACHINE_STATUS_LABELS[machine.status]} · Activa: {machine.active ? 'Sí' : 'No'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setExpenseOpen(true)}>
            <Plus />
            Registrar gasto
          </Button>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil />
            Editar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total gastado</CardTitle>
          </CardHeader>
          <CardContent>
            <DisplayMoney amount={machine.totalSpent ?? '0'} currencyCode="USD" size="lg" />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Datos de la máquina</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Marca:</span> {machine.brand ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Modelo:</span> {machine.model ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Serial:</span> {machine.serialNumber ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Ubicación:</span> {machine.location ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Adquisición:</span>{' '}
              {formatDate(machine.acquisitionDate)}
            </p>
            <p>
              <span className="text-muted-foreground">Costo:</span>{' '}
              {machine.acquisitionCost ? (
                <DisplayMoney amount={machine.acquisitionCost} currencyCode="USD" size="sm" />
              ) : (
                '—'
              )}
            </p>
            {machine.notes ? (
              <p className="sm:col-span-2">
                <span className="text-muted-foreground">Notas:</span> {machine.notes}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos gastos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <AccountSelect
              value={unassignedOnly ? null : accountFilter}
              onChange={(value) => {
                setUnassignedOnly(false)
                setAccountFilter(value)
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
                  }}
                />
                Solo sin cuenta
              </label>
            </div>
          </div>

          {expenses.length === 0 ? (
            <p className="text-muted-foreground text-sm">Esta máquina aún no tiene gastos registrados.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b text-left">
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Categoría</th>
                    <th className="px-4 py-3 font-medium">Descripción</th>
                    <th className="px-4 py-3 font-medium">Cuenta</th>
                    <th className="px-4 py-3 font-medium">Proveedor</th>
                    <th className="px-4 py-3 font-medium">Monto</th>
                    <th className="px-4 py-3 font-medium">Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3">{formatDate(expense.date)}</td>
                      <td className="px-4 py-3">{MACHINE_EXPENSE_CATEGORY_LABELS[expense.category]}</td>
                      <td className="px-4 py-3">{expense.description}</td>
                      <td className="text-muted-foreground px-4 py-3">
                        {expense.account?.name ?? '—'}
                      </td>
                      <td className="text-muted-foreground px-4 py-3">{expense.supplier?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <DisplayMoney
                          amount={expense.amount}
                          currencyCode={expense.currencyCode ?? 'USD'}
                        />
                      </td>
                      <td className="text-muted-foreground px-4 py-3">
                        {formatDateTime(expense.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <MachineFormDialog open={editOpen} onOpenChange={setEditOpen} machine={machine} />

      <MachineExpenseFormDialog
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        machineId={machineId}
      />
    </div>
  )
}
