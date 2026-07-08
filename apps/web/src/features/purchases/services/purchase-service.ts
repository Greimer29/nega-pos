import { api } from '@/lib/api'
import type {
  ConfirmPurchaseInput,
  PurchaseDeleteResponse,
  PurchaseInput,
  PurchaseItem,
  PurchaseItemInput,
  PurchaseListParams,
  PurchaseListResponse,
  PurchaseResponse,
  PurchaseSummaryResponse,
} from '@/features/purchases/types'
import type { CostWarning } from '@/lib/cost-warnings'

export async function listPurchases(params: PurchaseListParams = {}) {
  const { data } = await api.get<PurchaseListResponse>('/purchases', {
    params: {
      page: params.page,
      per_page: params.perPage,
      supplier_id: params.supplier_id,
      status: params.status,
      date_desde: params.date_desde,
      date_hasta: params.date_hasta,
      account_id: params.account_id,
      unassigned: params.unassigned,
    },
  })

  return data.data
}

export async function getPurchasesSummary() {
  const { data } = await api.get<PurchaseSummaryResponse>('/purchases/summary')
  return data.data.summary
}

export async function getPurchase(id: number) {
  const { data } = await api.get<PurchaseResponse>(`/purchases/${id}`)
  return data.data.purchase
}

export async function createPurchase(payload: PurchaseInput) {
  const { data } = await api.post<PurchaseResponse>('/purchases', payload)
  return data.data.purchase
}

export async function updatePurchase(id: number, payload: PurchaseInput) {
  const { data } = await api.put<PurchaseResponse>(`/purchases/${id}`, payload)
  return data.data.purchase
}

export async function deletePurchase(id: number) {
  const { data } = await api.delete<PurchaseDeleteResponse>(`/purchases/${id}`)
  return data.data
}

export async function confirmarPurchase(id: number, payload: ConfirmPurchaseInput = {}) {
  const { data } = await api.post<{
    data: PurchaseResponse['data'] & {
      cost_warnings?: CostWarning[]
      fulfilled_orders?: { id: number; code: string }[]
    }
  }>(`/purchases/${id}/confirm`, payload)

  return {
    purchase: data.data.purchase,
    costWarnings: data.data.cost_warnings ?? [],
    fulfilledOrders: data.data.fulfilled_orders ?? [],
  }
}

export async function returnPurchase(id: number) {
  const { data } = await api.post<PurchaseResponse>(`/purchases/${id}/return`)
  return data.data.purchase
}

export async function uploadFactura(purchaseId: number, file: File) {
  const formData = new FormData()
  formData.append('factura', file)

  const { data } = await api.post<PurchaseResponse>(`/purchases/${purchaseId}/invoice`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return data.data.purchase
}

export async function downloadFactura(purchaseId: number) {
  const response = await api.get<Blob>(`/purchases/${purchaseId}/invoice`, {
    responseType: 'blob',
  })

  return response.data
}

type PurchaseItemResponse = {
  data: {
    item: PurchaseItem
  }
}

export async function createPurchaseItem(purchaseId: number, payload: PurchaseItemInput) {
  const { data } = await api.post<PurchaseItemResponse>(`/purchases/${purchaseId}/items`, payload)
  return data.data.item
}

export async function updatePurchaseItem(
  purchaseId: number,
  itemId: number,
  payload: Partial<PurchaseItemInput>
) {
  const { data } = await api.put<PurchaseItemResponse>(
    `/purchases/${purchaseId}/items/${itemId}`,
    payload
  )
  return data.data.item
}

export async function deletePurchaseItem(purchaseId: number, itemId: number) {
  const { data } = await api.delete<{ data: { id: number; eliminado: boolean } }>(
    `/purchases/${purchaseId}/items/${itemId}`
  )
  return data.data
}
