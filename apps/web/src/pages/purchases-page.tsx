import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PanelHeader } from '@/components/layout/panel-header'
import type { PurchasesHubTab } from '@/features/purchases/constants'
import { PurchasesHubCards } from '@/features/purchases/components/purchases-hub-cards'
import { PurchasesHubPanelTransition } from '@/features/purchases/components/purchases-hub-panel-transition'
import { usePurchasesSummaryQuery } from '@/features/purchases/hooks/use-purchases'
import { useExpensesSummaryQuery } from '@/features/purchases/hooks/use-expenses'

function parseTab(value: string | null): PurchasesHubTab {
  if (value === 'gastos') {
    return value
  }
  return 'compras'
}

export function PurchasesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<PurchasesHubTab>(() => parseTab(searchParams.get('tab')))

  useEffect(() => {
    setActiveTab(parseTab(searchParams.get('tab')))
  }, [searchParams])

  function handleTabChange(tab: PurchasesHubTab) {
    setActiveTab(tab)
    const next = new URLSearchParams(searchParams)
    next.set('tab', tab)
    setSearchParams(next, { replace: true })
  }

  const purchasesQueryState = usePurchasesSummaryQuery()
  const expensesQueryState = useExpensesSummaryQuery()

  const {
    data: purchasesSummary,
    isLoading: loadingPurchases,
    isError: purchasesError,
    error: purchasesQueryError,
  } = purchasesQueryState
  const {
    data: expensesSummary,
    isLoading: loadingExpenses,
    isError: expensesError,
    error: expensesQueryError,
  } = expensesQueryState

  return (
    <div className="flex flex-col gap-6">
      <PanelHeader
        title="Compras"
        description="Compras a proveedores y gastos de empresa."
      />

      <PurchasesHubCards
        activeTab={activeTab}
        onTabChange={handleTabChange}
        purchasesSummary={purchasesSummary}
        expensesSummary={expensesSummary}
        purchasesQuery={{
          isLoading: loadingPurchases,
          isError: purchasesError,
          error: purchasesQueryError,
        }}
        expensesQuery={{
          isLoading: loadingExpenses,
          isError: expensesError,
          error: expensesQueryError,
        }}
      />

      <PurchasesHubPanelTransition activeTab={activeTab} />
    </div>
  )
}
