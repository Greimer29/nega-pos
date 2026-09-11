import { SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useActiveAccountsQuery } from '@/features/accounts/hooks/use-accounts'
import { ReportPeriodFilters } from '@/features/reports/components/report-period-filters'
import type { ReportPeriodState } from '@/features/reports/report-period'
import { reportUi } from '@/features/reports/report-ui'
import { cn } from '@/lib/utils'

const ALL_ACCOUNTS = ''
const UNASSIGNED = '__unassigned__'

export type ReportTypeFilters = {
  sales: boolean
  incomes: boolean
  purchases: boolean
  expenses: boolean
  machine_expenses: boolean
}

type ReportFiltersToolbarProps = {
  period: ReportPeriodState
  accountId: number | null
  unassignedOnly: boolean
  types: ReportTypeFilters
  onPeriodChange: (value: ReportPeriodState) => void
  onAccountIdChange: (value: number | null) => void
  onUnassignedOnlyChange: (value: boolean) => void
  onTypesChange: (value: ReportTypeFilters) => void
}

const TYPE_OPTIONS: Array<{ key: keyof ReportTypeFilters; label: string }> = [
  { key: 'sales', label: 'Ventas' },
  { key: 'incomes', label: 'Ingresos' },
  { key: 'purchases', label: 'Compras' },
  { key: 'expenses', label: 'Gastos' },
  { key: 'machine_expenses', label: 'Gastos máquina (histórico)' },
]

export function ReportFiltersToolbar({
  period,
  accountId,
  unassignedOnly,
  types,
  onPeriodChange,
  onAccountIdChange,
  onUnassignedOnlyChange,
  onTypesChange,
}: ReportFiltersToolbarProps) {
  const [expanded, setExpanded] = useState(false)
  const { data: accountsData, isLoading: accountsLoading } = useActiveAccountsQuery()
  const accounts = accountsData?.accounts ?? []

  const accountFilterValue = unassignedOnly
    ? UNASSIGNED
    : accountId != null
      ? String(accountId)
      : ALL_ACCOUNTS

  function toggleType(key: keyof ReportTypeFilters) {
    const next = { ...types, [key]: !types[key] }
    if (!Object.values(next).some(Boolean)) return
    onTypesChange(next)
  }

  function onAccountFilterChange(raw: string) {
    if (raw === UNASSIGNED) {
      onUnassignedOnlyChange(true)
      onAccountIdChange(null)
      return
    }
    onUnassignedOnlyChange(false)
    onAccountIdChange(raw === ALL_ACCOUNTS ? null : Number(raw))
  }

  return (
    <div className={cn(reportUi.panel, 'p-5 md:p-6')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportPeriodFilters value={period} onChange={onPeriodChange} />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setExpanded((value) => !value)}
          className={reportUi.btnGhost}
        >
          <SlidersHorizontal className="size-4" />
          Filtros
        </Button>
      </div>

      {expanded ? (
        <div className={cn('mt-5 space-y-4 border-t pt-5', reportUi.divider)}>
          <div className="max-w-md space-y-2">
            <Label htmlFor="report-account-filter" className="text-neutral-600">
              Cuenta
            </Label>
            <select
              id="report-account-filter"
              disabled={accountsLoading}
              value={accountFilterValue}
              onChange={(e) => onAccountFilterChange(e.target.value)}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value={ALL_ACCOUNTS}>Todas las cuentas</option>
              <option value={UNASSIGNED}>Solo sin cuenta</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleType(key)}
                className={types[key] ? reportUi.pillActive : reportUi.pillInactive}
              >
                {label}
              </button>
            ))}
          </div>

          <p className={reportUi.muted}>
            Compras, gastos e ingresos se filtran por cuenta. Ventas no tienen cuenta asignada y
            siguen visibles salvo que desactives el tipo Ventas.
          </p>
        </div>
      ) : null}
    </div>
  )
}
