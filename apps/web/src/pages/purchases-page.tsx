import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PanelHeader } from '@/components/layout/panel-header'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { canAccess } from '@/features/permissions/catalog'
import type { PurchasesHubTab } from '@/features/purchases/constants'
import { PurchasesHubCards } from '@/features/purchases/components/purchases-hub-cards'
import { PurchasesHubPanelTransition } from '@/features/purchases/components/purchases-hub-panel-transition'
import { usePurchasesHubSummaryQuery } from '@/features/purchases/hooks/use-purchases'

function parseTab(value: string | null): PurchasesHubTab {
  if (value === 'gastos' || value === 'ingresos') {
    return value
  }
  return 'compras'
}

export function PurchasesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<PurchasesHubTab>(() => parseTab(searchParams.get('tab')))
  const { user } = useAuth()
  const canViewIncomes = canAccess(user?.role, user?.permissions, 'incomes.view')
  const canViewExpenses = canAccess(user?.role, user?.permissions, 'expenses.view')

  useEffect(() => {
    setActiveTab(parseTab(searchParams.get('tab')))
  }, [searchParams])

  function handleTabChange(tab: PurchasesHubTab) {
    setActiveTab(tab)
    const next = new URLSearchParams(searchParams)
    next.set('tab', tab)
    setSearchParams(next, { replace: true })
  }

  const {
    data: hubSummary,
    isLoading,
    isError,
    error,
  } = usePurchasesHubSummaryQuery()

  const purchasesQuery = { isLoading, isError, error }
  const expensesQuery = {
    isLoading: canViewExpenses && isLoading,
    isError: canViewExpenses && isError,
    error,
  }
  const incomesQuery = {
    isLoading: canViewIncomes && isLoading,
    isError: canViewIncomes && isError,
    error,
  }

  return (
    <div className="flex flex-col gap-6">
      <PanelHeader
        title="Compras"
        description="Compras a proveedores, gastos e ingresos de empresa."
      />

      <PurchasesHubCards
        activeTab={activeTab}
        onTabChange={handleTabChange}
        purchasesSummary={hubSummary?.purchases}
        expensesSummary={hubSummary?.expenses}
        incomesSummary={hubSummary?.incomes}
        purchasesQuery={purchasesQuery}
        expensesQuery={expensesQuery}
        incomesQuery={incomesQuery}
      />

      <PurchasesHubPanelTransition activeTab={activeTab} />
    </div>
  )
}
