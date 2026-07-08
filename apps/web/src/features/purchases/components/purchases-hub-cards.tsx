import type { ReactNode } from 'react'
import { Receipt, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import type { PurchasesHubTab } from '@/features/purchases/constants'
import type { ExpenseSummary, PurchaseSummary } from '@/features/purchases/types'
import { settingsTabUrl } from '@/features/settings/constants'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

type HubCardQueryState = {
  isLoading?: boolean
  isError?: boolean
  error?: unknown
}

type PurchasesHubCardsProps = {
  activeTab: PurchasesHubTab
  onTabChange: (tab: PurchasesHubTab) => void
  purchasesSummary?: PurchaseSummary
  expensesSummary?: ExpenseSummary
  purchasesQuery?: HubCardQueryState
  expensesQuery?: HubCardQueryState
}

export function PurchasesHubCards({
  activeTab,
  onTabChange,
  purchasesSummary,
  expensesSummary,
  purchasesQuery,
  expensesQuery,
}: PurchasesHubCardsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <HubCard
          active={activeTab === 'compras'}
          onClick={() => onTabChange('compras')}
          icon={<Receipt className="size-5" />}
          title="Compras realizadas"
          kpis={[
            {
              label: 'Total compras',
              value: <DisplayMoneyFromUsd amountUsd={purchasesSummary?.totalUsd ?? '0'} />,
            },
            {
              label: 'Confirmadas',
              value: purchasesSummary
                ? `${purchasesSummary.confirmedPercent.toFixed(0)}%`
                : '—',
            },
            {
              label: 'Registradas',
              value: purchasesSummary ? String(purchasesSummary.count) : '—',
            },
          ]}
          queryState={purchasesQuery}
        />

        <HubCard
          active={activeTab === 'gastos'}
          onClick={() => onTabChange('gastos')}
          icon={<Wallet className="size-5" />}
          title="Gastos"
          kpis={[
            {
              label: 'Total gastos',
              value: <DisplayMoneyFromUsd amountUsd={expensesSummary?.totalUsd ?? '0'} />,
            },
            {
              label: 'Registrados',
              value: expensesSummary ? String(expensesSummary.count) : '—',
            },
            {
              label: 'Esta semana',
              value: <DisplayMoneyFromUsd amountUsd={expensesSummary?.weeklySpentUsd ?? '0'} />,
            },
          ]}
          queryState={expensesQuery}
        />
      </div>

      <p className="text-muted-foreground text-sm">
        Tasa, margen, categorías y cuentas están en{' '}
        <Link to={settingsTabUrl('compras')} className="text-foreground underline underline-offset-4">
          Configuración → Compras
        </Link>
        .
      </p>
    </div>
  )
}

type HubCardProps = {
  active: boolean
  onClick: () => void
  icon: ReactNode
  title: string
  kpis: Array<{ label: string; value: ReactNode; danger?: boolean }>
  queryState?: HubCardQueryState
}

function HubCard({ active, onClick, icon, title, kpis, queryState }: HubCardProps) {
  const isLoading = queryState?.isLoading ?? false
  const isError = queryState?.isError ?? false
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left focus:outline-none"
    >
      <Card
        className={cn(
          'purchases-hub-card aspect-[15/7] h-full border shadow-none',
          active && 'purchases-hub-card--active'
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Cargando…</p>
          ) : isError ? (
            <p className="text-destructive text-sm whitespace-pre-line">
              {getApiErrorMessage(queryState?.error)}
            </p>
          ) : (
            kpis.map((kpi) => (
              <div key={kpi.label} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{kpi.label}</span>
                <span
                  className={cn(
                    'font-semibold tabular-nums',
                    kpi.danger && 'text-destructive'
                  )}
                >
                  {kpi.value}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </button>
  )
}
