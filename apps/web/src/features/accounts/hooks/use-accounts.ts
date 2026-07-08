import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAccount,
  deleteAccount,
  listAccounts,
  updateAccount,
} from '@/features/accounts/services/account-service'
import type { AccountInput, AccountListParams } from '@/features/accounts/types'

export const accountsQueryKey = ['accounts'] as const

export function useAccountsQuery(params: AccountListParams = {}) {
  return useQuery({
    queryKey: [...accountsQueryKey, params],
    queryFn: () => listAccounts(params),
  })
}

export function useActiveAccountsQuery() {
  return useAccountsQuery({ page: 1, perPage: 100, active: true })
}

export function useCreateAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AccountInput) => createAccount(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountsQueryKey })
    },
  })
}

export function useUpdateAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AccountInput }) =>
      updateAccount(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountsQueryKey })
    },
  })
}

export function useDeleteAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteAccount(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountsQueryKey })
    },
  })
}
