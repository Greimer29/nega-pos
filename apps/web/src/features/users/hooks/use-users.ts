import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createUser,
  listUsers,
  setUserActive,
  updateUser,
} from '@/features/users/services/user-service'
import type { UserInput, UserListParams } from '@/features/users/types'

export const usersQueryKey = ['users'] as const

export function useUsersQuery(params: UserListParams) {
  return useQuery({
    queryKey: [...usersQueryKey, params],
    queryFn: () => listUsers(params),
  })
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UserInput) => createUser(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersQueryKey })
    },
  })
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<UserInput> }) =>
      updateUser(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersQueryKey })
    },
  })
}

export function useSetUserActiveMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => setUserActive(id, active),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersQueryKey })
    },
  })
}
