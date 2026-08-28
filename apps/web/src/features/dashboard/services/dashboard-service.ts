import { api } from '@/lib/api'
import type {
  DashboardChartMode,
  DashboardOverviewResponse,
  DailyClosingResponse,
  DailyExpensesResponse,
  DailyProductSalesResponse,
} from '@/features/dashboard/types'

export async function getDashboardOverview(chart: DashboardChartMode = 'weekly') {
  const { data } = await api.get<DashboardOverviewResponse>('/dashboard/overview', {
    params: { chart },
  })
  return data.data
}

export async function getDailyProductSales() {
  const { data } = await api.get<DailyProductSalesResponse>('/dashboard/daily-product-sales')
  return data.data
}

export async function getDailyExpenses() {
  const { data } = await api.get<DailyExpensesResponse>('/dashboard/daily-expenses')
  return data.data
}

export async function getDailyClosing(salesShiftId?: number) {
  const { data } = await api.get<DailyClosingResponse>('/dashboard/daily-closing', {
    params: { sales_shift_id: salesShiftId || undefined },
  })
  return data.data
}
