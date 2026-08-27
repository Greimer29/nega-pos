import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PanelHeader } from '@/components/layout/panel-header'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { canAccess } from '@/features/permissions/catalog'
import type { PurchasesHubTab } from '@/features/purchases/constants'
import { PurchasesHubCards } from '@/features/purchases/components/purchases-hub-cards'
import { PurchasesHubPanelTransition } from '@/features/purchases/components/purchases-hub-panel-transition'
import { usePurchasesSummaryQuery } from '@/features/purchases/hooks/use-purchases'
import { useExpensesSummaryQuery } from '@/features/purchases/hooks/use-expenses'
import { useIncomesSummaryQuery } from '@/features/purchases/hooks/use-incomes'

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

  const purchasesQueryState = usePurchasesSummaryQuery()
  const expensesQueryState = useExpensesSummaryQuery({ enabled: canViewExpenses })
  const incomesQueryState = useIncomesSummaryQuery({ enabled: canViewIncomes })

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
  const {
    data: incomesSummary,
    isLoading: loadingIncomes,
    isError: incomesError,
    error: incomesQueryError,
  } = incomesQueryState

  return (
    <div className="flex flex-col gap-6">
      <PanelHeader
        title="Compras"
        description="Compras a proveedores, gastos e ingresos de empresa."
      />

      <PurchasesHubCards
        activeTab={activeTab}
        onTabChange={handleTabChange}
        purchasesSummary={purchasesSummary}
        expensesSummary={expensesSummary}
        incomesSummary={incomesSummary}
        purchasesQuery={{
          isLoading: loadingPurchases,
          isError: purchasesError,
          error: purchasesQueryError,
        }}
        expensesQuery={{
          isLoading: canViewExpenses && loadingExpenses,
          isError: canViewExpenses && expensesError,
          error: expensesQueryError,
        }}
        incomesQuery={{
          isLoading: canViewIncomes && loadingIncomes,
          isError: canViewIncomes && incomesError,
          error: incomesQueryError,
        }}
      />

      <PurchasesHubPanelTransition activeTab={activeTab} />
    </div>
  )
}
