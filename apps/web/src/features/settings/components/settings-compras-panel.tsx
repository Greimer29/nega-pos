import { ProfitMarginConfigCard } from '@/features/purchases/components/profit-margin-config-card'
import { AccountsConfigCard } from '@/features/accounts/components/accounts-config-card'
import { CurrenciesConfigCard } from '@/features/currencies/components/currencies-config-card'
import { CategoriesConfigCard } from '@/features/categories/components/categories-config-card'
import { useProfitMarginQuery } from '@/features/purchases/hooks/use-settings'

type SettingsComprasPanelProps = {
  highlightProductId?: number
}

export function SettingsComprasPanel({ highlightProductId }: SettingsComprasPanelProps) {
  const { data: currentMargin, isLoading: loadingMargin } = useProfitMarginQuery()

  return (
    <div className="space-y-6">
      <CurrenciesConfigCard />
      <ProfitMarginConfigCard
        defaultMarginPercent={loadingMargin ? undefined : currentMargin}
        highlightProductId={highlightProductId}
      />
      <CategoriesConfigCard />
      <AccountsConfigCard />
    </div>
  )
}
