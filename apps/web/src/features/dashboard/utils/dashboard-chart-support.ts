import type { DashboardChartMode } from '@/features/dashboard/types'
import { apiErrorDetailsIncludeField, getApiError } from '@/lib/api-error'

export const DASHBOARD_DAILY_CHART_MESSAGE =
  'La vista diaria aún no está disponible en el servidor. Usá semanal o mensual.'

const DAILY_CHART_SUPPORTED_KEY = 'dashboard:daily-chart-supported'

export function isDashboardChartValidationError(error: unknown): boolean {
  const apiError = getApiError(error)

  return (
    apiError.code === 'VALIDATION_ERROR' &&
    apiErrorDetailsIncludeField(apiError.details, 'chart')
  )
}

export function isDailyDashboardChartSupported(): boolean {
  if (typeof window === 'undefined') {
    return true
  }

  return sessionStorage.getItem(DAILY_CHART_SUPPORTED_KEY) !== 'false'
}

export function markDailyDashboardChartSupported(supported: boolean) {
  if (typeof window === 'undefined') {
    return
  }

  sessionStorage.setItem(DAILY_CHART_SUPPORTED_KEY, supported ? 'true' : 'false')
}

export function canSelectDashboardChartMode(mode: DashboardChartMode): boolean {
  if (mode !== 'daily') {
    return true
  }

  return isDailyDashboardChartSupported()
}
