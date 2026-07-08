import { SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AccountSelect } from '@/features/accounts/components/account-select'
import { ReportPeriodFilters } from '@/features/reports/components/report-period-filters'
import type { ReportPeriodState } from '@/features/reports/report-period'
import { reportUi } from '@/features/reports/report-ui'
import { cn } from '@/lib/utils'

export type ReportTypeFilters = {
  sales: boolean
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
  { key: 'purchases', label: 'Compras' },
  { key: 'expenses', label: 'Gastos empresa' },
  { key: 'machine_expenses', label: 'Gastos máquina' },
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

  function toggleType(key: keyof ReportTypeFilters) {
    const next = { ...types, [key]: !types[key] }
    if (!Object.values(next).some(Boolean)) return
    onTypesChange(next)
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
          <div className="grid gap-4 md:grid-cols-2">
            <AccountSelect
              value={unassignedOnly ? null : accountId}
              onChange={(value) => {
                onUnassignedOnlyChange(false)
                onAccountIdChange(value)
              }}
              disabled={unassignedOnly}
              label="Cuenta"
              className="[&_label]:text-neutral-600 [&_select]:rounded-lg [&_select]:border-neutral-300 [&_select]:bg-white"
            />
            <label className={`flex items-end gap-2 pb-2 ${reportUi.body}`}>
              <input
                type="checkbox"
                checked={unassignedOnly}
                onChange={(e) => {
                  onUnassignedOnlyChange(e.target.checked)
                  if (e.target.checked) onAccountIdChange(null)
                }}
                className="accent-neutral-900"
              />
              Solo movimientos sin cuenta
            </label>
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
            Los ingresos por ventas son globales. Los egresos se filtran por cuenta cuando aplica.
          </p>
        </div>
      ) : null}
    </div>
  )
}
