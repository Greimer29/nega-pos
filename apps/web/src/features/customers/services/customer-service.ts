import type {
  Customer,
  CustomerAccountStatementResponse,
  CustomerDeleteResponse,
  CustomerDetalle,
  CustomerInput,
  CustomerListParams,
  CustomerListResponse,
  CustomerPaymentInput,
  CustomerResponse,
} from '@/features/customers/types'
import { api } from '@/lib/api'

export async function listCustomers(params: CustomerListParams = {}) {
  const { data } = await api.get<CustomerListResponse>('/customers', {
    params: {
      page: params.page,
      per_page: params.perPage,
      search: params.search || undefined,
      type: params.type,
      active: params.active,
    },
  })

  return data.data
}

export async function getCustomer(id: number) {
  const { data } = await api.get<CustomerResponse>(`/customers/${id}`)
  return data.data.customer as CustomerDetalle
}

export async function createCustomer(payload: CustomerInput) {
  const { data } = await api.post<CustomerResponse>('/customers', payload)
  return data.data.customer as Customer
}

export async function updateCustomer(id: number, payload: CustomerInput) {
  const { data } = await api.put<CustomerResponse>(`/customers/${id}`, payload)
  return data.data.customer as Customer
}

export async function deleteCustomer(id: number) {
  const { data } = await api.delete<CustomerDeleteResponse>(`/customers/${id}`)
  return data.data
}

export async function getCustomerAccountStatement(id: number) {
  const { data } = await api.get<CustomerAccountStatementResponse>(
    `/customers/${id}/account-statement`
  )
  return data.data
}

export async function createCustomerPayment(customerId: number, payload: CustomerPaymentInput) {
  const { data } = await api.post<{ data: { payment: { id: number } } }>(
    `/customers/${customerId}/payments`,
    payload
  )
  return data.data.payment
}
