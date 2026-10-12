import { api } from '@/lib/api'
import type { OfflineCatalogSnapshot, OfflineSaleOperation } from '@/features/offline/types'
import type { Sale } from '@/features/ventas/types'

export async function fetchOfflineCatalog(): Promise<OfflineCatalogSnapshot> {
  const { data } = await api.get<{ data: { catalog: OfflineCatalogSnapshot } }>(
    '/sales/offline-catalog'
  )
  return data.data.catalog
}

export async function syncOfflineSale(operation: OfflineSaleOperation): Promise<{
  alreadySynced: boolean
  sale: Sale
}> {
  const { data } = await api.post<{
    data: { already_synced: boolean; sale: Sale }
  }>('/sales/offline', {
    offline_client_id: operation.offline_client_id,
    sold_at: operation.sold_at,
    sales_shift_id: operation.sales_shift_id,
    customer_id: operation.customer_id,
    guest_name: operation.guest_name,
    payment_type: operation.payment_type,
    billing_mode: operation.billing_mode,
    discount_usd: operation.discount_usd,
    notes: operation.notes,
    payment_method_code: operation.payment_method_code,
    currency_code: operation.currency_code,
    usd_rate: operation.usd_rate,
    payments: operation.payments,
    lines: operation.lines,
  })
  return {
    alreadySynced: data.data.already_synced,
    sale: data.data.sale,
  }
}

export async function syncOfflineReturn(payload: {
  sale_id: number
  lines?: Array<{ line_id: number; quantity: number }>
}) {
  const { data } = await api.post<{ data: { sale: Sale } }>('/sales/offline/returns', payload)
  return data.data.sale
}

export async function syncOfflineTransition(payload: {
  sale_id: number
  order_status: 'IN_PROCESS' | 'DELIVERED'
}) {
  const { data } = await api.post<{ data: { sale: Sale } }>('/sales/offline/transitions', payload)
  return data.data.sale
}

export async function syncOfflineCloseShift(salesShiftId: number) {
  const { data } = await api.post<{
    data: { shift: { id: number; status: string; closed_at: string | null } }
  }>('/sales/offline/close-shift', { sales_shift_id: salesShiftId })
  return data.data.shift
}
