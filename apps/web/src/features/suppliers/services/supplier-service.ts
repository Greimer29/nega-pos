import { api } from '@/lib/api'
import type {
  SupplierAccountStatement,
  SupplierDeleteResponse,
  SupplierInput,
  SupplierListParams,
  SupplierListResponse,
  SupplierPaymentInput,
  SupplierResponse,
} from '@/features/suppliers/types'

export async function listSuppliers(params: SupplierListParams = {}) {
  const { data } = await api.get<SupplierListResponse>('/suppliers', {
    params: {
      page: params.page,
      per_page: params.perPage,
      search: params.search || undefined,
      active: params.active,
    },
  })

  return data.data
}

export async function getSupplier(id: number) {
  const { data } = await api.get<SupplierResponse>(`/suppliers/${id}`)
  return data.data.supplier
}

export async function createSupplier(payload: SupplierInput) {
  const { data } = await api.post<SupplierResponse>('/suppliers', payload)
  return data.data.supplier
}

export async function updateSupplier(id: number, payload: SupplierInput) {
  const { data } = await api.put<SupplierResponse>(`/suppliers/${id}`, payload)
  return data.data.supplier
}

export async function deleteSupplier(id: number) {
  const { data } = await api.delete<SupplierDeleteResponse>(`/suppliers/${id}`)
  return data.data
}

export async function getSupplierAccountStatement(id: number) {
  const { data } = await api.get<{ data: SupplierAccountStatement }>(
    `/suppliers/${id}/account-statement`
  )
  return data.data
}

export async function createSupplierPayment(supplierId: number, payload: SupplierPaymentInput) {
  const { data } = await api.post<{ data: { payment: { id: number } } }>(
    `/suppliers/${supplierId}/payments`,
    payload
  )
  return data.data.payment
}

export async function uploadSupplierImage(id: number, file: File) {
  const formData = new FormData()
  formData.append('image', file)
  const { data } = await api.post<SupplierResponse>(`/suppliers/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data.supplier
}

export async function deleteSupplierImage(id: number) {
  const { data } = await api.delete<SupplierResponse>(`/suppliers/${id}/image`)
  return data.data.supplier
}
