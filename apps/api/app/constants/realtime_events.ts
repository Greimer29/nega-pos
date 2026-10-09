/**
 * Lightweight company-scoped realtime events.
 * Clients invalidate TanStack Query caches; payloads stay small (no row dumps).
 */
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

export function companyRealtimeChannel(companyId: number): string {
  return `company/${companyId}`
}
