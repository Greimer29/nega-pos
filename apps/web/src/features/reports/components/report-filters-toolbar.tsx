import { Landmark, Layers } from 'lucide-react'
import { useState } from 'react'
import { FilterSection, FiltersPanel } from '@/components/filters/filters-panel'
import { FiltersDrawer } from '@/components/filters/filters-drawer'
import { FiltersIconButton } from '@/components/filters/filters-icon-button'
import { useActiveAccountsQuery } from '@/features/accounts/hooks/use-accounts'
import { ReportPeriodFilters } from '@/features/reports/components/report-period-filters'
import type { ReportPeriodState } from '@/features/reports/report-period'
import { reportUi } from '@/features/reports/report-ui'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

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

const DEFAULT_TYPES: ReportTypeFilters = {
  sales: true,
  incomes: true,
  purchases: true,
  expenses: true,
  machine_expenses: false,
}

const TYPE_OPTIONS: Array<{ key: keyof ReportTypeFilters; label: string }> = [
  { key: 'sales', label: 'Cobros por ventas' },
  { key: 'incomes', label: 'Aportes de capital' },
  { key: 'purchases', label: 'Compras' },
  { key: 'expenses', label: 'Gastos operativos' },
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
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { data: accountsData } = useActiveAccountsQuery()
  const accounts = accountsData?.accounts ?? []

  const typesDiffer =
    types.sales !== DEFAULT_TYPES.sales ||
    types.incomes !== DEFAULT_TYPES.incomes ||
    types.purchases !== DEFAULT_TYPES.purchases ||
    types.expenses !== DEFAULT_TYPES.expenses
  const activeFilterCount =
    (accountId != null ? 1 : 0) + (unassignedOnly ? 1 : 0) + (typesDiffer ? 1 : 0)

  function toggleType(key: keyof ReportTypeFilters) {
    const next = { ...types, [key]: !types[key] }
    if (!Object.values(next).some(Boolean)) return
    onTypesChange(next)
  }

  function clearAll() {
    onAccountIdChange(null)
    onUnassignedOnlyChange(false)
    onTypesChange({ ...DEFAULT_TYPES })
  }

  return (
    <div className={cn(reportUi.panel, 'p-5 md:p-6')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportPeriodFilters value={period} onChange={onPeriodChange} />
        <FiltersIconButton
          count={activeFilterCount}
          expanded={filtersOpen}
          controls="reportes-financieros-filters"
          onClick={() => setFiltersOpen(true)}
        />
      </div>

      <FiltersDrawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        id="reportes-financieros-filters"
        title="Filtros de flujo de caja"
        description="Cuenta y tipos de movimiento de caja (no de utilidad)."
      >
        <FiltersPanel onClearAll={clearAll}>
          <FilterSection title="Cuenta" icon={<Landmark className="size-4 text-neutral-500" />}>
            <div className="space-y-3">
              <select
                className="border-input flex h-9 w-full rounded-md border bg-white px-3 text-sm"
                value={unassignedOnly ? '__unassigned__' : accountId != null ? String(accountId) : ''}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === '__unassigned__') {
                    onUnassignedOnlyChange(true)
                    onAccountIdChange(null)
                    return
                  }
                  onUnassignedOnlyChange(false)
                  onAccountIdChange(raw === '' ? null : Number(raw))
                }}
              >
                <option value="">Todas las cuentas</option>
                <option value="__unassigned__">Solo sin cuenta</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              <p className="text-muted-foreground text-xs">
                Compras, gastos e ingresos se filtran por cuenta. Las ventas no tienen cuenta y
                siguen visibles salvo que desactives el tipo Ventas.
              </p>
            </div>
          </FilterSection>

          <FilterSection
            title="Tipos de movimiento"
            icon={<Layers className="size-4 text-neutral-500" />}
          >
            <div className="space-y-2.5">
              {TYPE_OPTIONS.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2.5 text-sm text-neutral-700"
                >
                  <Checkbox
                    checked={types[key]}
                    onChange={() => toggleType(key)}
                    className="accent-violet-700"
                  />
                  {label}
                </label>
              ))}
            </div>
          </FilterSection>
        </FiltersPanel>
      </FiltersDrawer>
    </div>
  )
}
