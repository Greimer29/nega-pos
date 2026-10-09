import type { QueryClient } from '@tanstack/react-query'
import {
  invalidateCatalogPricing,
  invalidateCustomerPayments,
  invalidateDashboardAndReports,
  invalidateExpensesFinancials,
  invalidateInventory,
  invalidatePurchasesFinancials,
  invalidateSalesFinancials,
  invalidateStockMovement,
  invalidateSupplierPayments,
} from '@/lib/query-invalidation'

export const COMPANY_REALTIME_EVENTS = [
  'sale.changed',
  'shift.changed',
  'purchase.changed',
  'catalog.changed',
  'material.changed',
  'customer.changed',
  'supplier.changed',
  'expense.changed',
  'income.changed',
  'settings.changed',
  'user.changed',
  'machine.changed',
  'order.changed',
] as const

export type CompanyRealtimeEvent = (typeof COMPANY_REALTIME_EVENTS)[number]

export type CompanyRealtimePayload = {
  event: CompanyRealtimeEvent
  at: string
}

function isCompanyRealtimeEvent(value: unknown): value is CompanyRealtimeEvent {
  return (
    typeof value === 'string' &&
    (COMPANY_REALTIME_EVENTS as readonly string[]).includes(value)
  )
}

export function parseCompanyRealtimePayload(data: unknown): CompanyRealtimePayload | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  const record = data as Record<string, unknown>
  if (!isCompanyRealtimeEvent(record.event)) {
    return null
  }

  return {
    event: record.event,
    at: typeof record.at === 'string' ? record.at : new Date().toISOString(),
  }
}

/**
 * Maps server signals → TanStack Query invalidation.
 * Every business event also refreshes dashboard + reports so open screens stay live.
 */
export function applyCompanyRealtimeEvent(
  queryClient: QueryClient,
  event: CompanyRealtimeEvent
): void {
  switch (event) {
    case 'sale.changed':
      invalidateSalesFinancials(queryClient)
      void queryClient.invalidateQueries({ queryKey: ['sales-shifts'] })
      break
    case 'shift.changed':
      void queryClient.invalidateQueries({ queryKey: ['sales-shifts'] })
      break
    case 'purchase.changed':
      invalidatePurchasesFinancials(queryClient)
      break
    case 'catalog.changed':
      invalidateCatalogPricing(queryClient)
      void queryClient.invalidateQueries({ queryKey: ['formulas'] })
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
      break
    case 'material.changed':
      invalidateStockMovement(queryClient)
      break
    case 'customer.changed':
      invalidateCustomerPayments(queryClient)
      break
    case 'supplier.changed':
      invalidateSupplierPayments(queryClient)
      break
    case 'expense.changed':
      invalidateExpensesFinancials(queryClient)
      break
    case 'income.changed':
      invalidateExpensesFinancials(queryClient)
      void queryClient.invalidateQueries({ queryKey: ['incomes'] })
      break
    case 'settings.changed':
      void queryClient.invalidateQueries({ queryKey: ['settings'] })
      void queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
      // Force active currency lists to refetch (staleTime must not hide the new rate).
      void queryClient.refetchQueries({ queryKey: ['currencies'], type: 'active' })
      invalidateInventory(queryClient)
      break
    case 'user.changed':
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      break
    case 'machine.changed':
      void queryClient.invalidateQueries({ queryKey: ['machines'] })
      void queryClient.invalidateQueries({ queryKey: ['expenses'] })
      break
    case 'order.changed':
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
      invalidateInventory(queryClient)
      break
    default: {
      const _exhaustive: never = event
      void _exhaustive
    }
  }

  // Shared surfaces used across the app (KPIs, cierres, estados financieros).
  invalidateDashboardAndReports(queryClient)
}

/** Safety net after SSE reconnect — refresh shared modules. */
export function invalidateAfterRealtimeReconnect(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: ['sales-shifts'] })
  void queryClient.invalidateQueries({ queryKey: ['sales'] })
  void queryClient.invalidateQueries({ queryKey: ['users'] })
  void queryClient.invalidateQueries({ queryKey: ['currencies'] })
  void queryClient.invalidateQueries({ queryKey: ['settings'] })
  void queryClient.invalidateQueries({ queryKey: ['orders'] })
  void queryClient.invalidateQueries({ queryKey: ['purchases'] })
  void queryClient.invalidateQueries({ queryKey: ['formulas'] })
  invalidateInventory(queryClient)
  invalidateDashboardAndReports(queryClient)
}
