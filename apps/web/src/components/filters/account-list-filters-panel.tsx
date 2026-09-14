import { Landmark } from 'lucide-react'
import { AccountSelect } from '@/features/accounts/components/account-select'
import { FilterSection, FiltersPanel } from '@/components/filters/filters-panel'
import { Checkbox } from '@/components/ui/checkbox'

type AccountListFiltersPanelProps = {
  accountId: number | null
  unassignedOnly: boolean
  onAccountIdChange: (value: number | null) => void
  onUnassignedOnlyChange: (value: boolean) => void
  onClearAll: () => void
}

export function AccountListFiltersPanel({
  accountId,
  unassignedOnly,
  onAccountIdChange,
  onUnassignedOnlyChange,
  onClearAll,
}: AccountListFiltersPanelProps) {
  return (
    <FiltersPanel onClearAll={onClearAll}>
      <FilterSection title="Cuenta" icon={<Landmark className="size-4 text-neutral-500" />}>
        <div className="space-y-3">
          <AccountSelect
            value={unassignedOnly ? null : accountId}
            onChange={(value) => {
              onUnassignedOnlyChange(false)
              onAccountIdChange(value)
            }}
            disabled={unassignedOnly}
            emptyLabel="Todas las cuentas"
          />
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-neutral-700">
            <Checkbox
              checked={unassignedOnly}
              onChange={(e) => onUnassignedOnlyChange(e.target.checked)}
              className="accent-violet-700"
            />
            Solo sin cuenta
          </label>
        </div>
      </FilterSection>
    </FiltersPanel>
  )
}
