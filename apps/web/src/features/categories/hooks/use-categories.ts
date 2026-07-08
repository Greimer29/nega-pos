import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '@/features/categories/services/category-service'
import type { CategoryInput, CategoryUpdateInput } from '@/features/categories/types'

export const categoriesQueryKey = ['categories'] as const

export function useCategoriesQuery(activeOnly = false) {
  return useQuery({
    queryKey: [...categoriesQueryKey, { activeOnly }],
    queryFn: () => listCategories(activeOnly),
  })
}

export function useActiveCategoriesQuery() {
  return useCategoriesQuery(true)
}

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CategoryInput) => createCategory(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoriesQueryKey })
    },
  })
}

export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CategoryUpdateInput }) =>
      updateCategory(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoriesQueryKey })
    },
  })
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoriesQueryKey })
    },
  })
}
