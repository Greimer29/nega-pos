import { keepPreviousData, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  getDailyClosing,
  getDailyExpenses,
  getDailyProductSales,
  getDashboardOverview,
} from '@/features/dashboard/services/dashboard-service'
import type { DashboardChartMode } from '@/features/dashboard/types'

export const dashboardOverviewQueryKey = ['dashboard', 'overview'] as const
export const dashboardQueryKey = ['dashboard'] as const
export const dailyProductSalesQueryKey = ['dashboard', 'daily-product-sales'] as const
export const dailyExpensesQueryKey = ['dashboard', 'daily-expenses'] as const
export const dailyClosingQueryKey = ['dashboard', 'daily-closing'] as const

export function useDashboardOverviewQuery(chart: DashboardChartMode = 'weekly') {
  return useQuery({
    queryKey: [...dashboardOverviewQueryKey, chart],
    queryFn: () => getDashboardOverview(chart),
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error) && error.response?.status === 422) {
        return false
      }

      return failureCount < 2
    },
  })
}

export function useDailyProductSalesQuery() {
  return useQuery({
    queryKey: dailyProductSalesQueryKey,
    queryFn: () => getDailyProductSales(),
  })
}

export function useDailyExpensesQuery() {
  return useQuery({
    queryKey: dailyExpensesQueryKey,
    queryFn: () => getDailyExpenses(),
  })
}

export function useDailyClosingQuery(date: string) {
  return useQuery({
    queryKey: [...dailyClosingQueryKey, date],
    queryFn: () => getDailyClosing(date),
  })
}
