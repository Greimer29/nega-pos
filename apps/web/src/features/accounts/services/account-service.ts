import type {
  Account,
  AccountDeleteResponse,
  AccountInput,
  AccountListParams,
  AccountListResponse,
  AccountResponse,
} from '@/features/accounts/types'
import { api } from '@/lib/api'

export async function listAccounts(params: AccountListParams = {}) {
  const { data } = await api.get<AccountListResponse>('/accounts', {
    params: {
      page: params.page,
      per_page: params.perPage,
      search: params.search || undefined,
      active: params.active,
    },
  })

  return data.data
}

export async function createAccount(payload: AccountInput) {
  const { data } = await api.post<AccountResponse>('/accounts', payload)
  return data.data.account as Account
}

export async function updateAccount(id: number, payload: AccountInput) {
  const { data } = await api.put<AccountResponse>(`/accounts/${id}`, payload)
  return data.data.account as Account
}

export async function deleteAccount(id: number) {
  const { data } = await api.delete<AccountDeleteResponse>(`/accounts/${id}`)
  return data.data
}
