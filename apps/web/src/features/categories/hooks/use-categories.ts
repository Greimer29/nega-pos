import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '@/features/categories/services/category-service'
import type { Category, CategoryInput, CategoryUpdateInput } from '@/features/categories/types'

export const categoriesQueryKey = ['categories'] as const

export function useCategoriesQuery(activeOnly = false) {
  return useQuery({
    queryKey: [...categoriesQueryKey, { activeOnly }],
    queryFn: () => listCategories(activeOnly),
    staleTime: 15_000,
  })
}

export function useActiveCategoriesQuery() {
  return useCategoriesQuery(true)
}

function patchCategoryLists(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (list: Category[]) => Category[]
) {
  queryClient.setQueriesData<Category[]>({ queryKey: categoriesQueryKey }, (current) => {
    if (!current) return current
    return updater(current)
  })
}

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CategoryInput) => createCategory(payload),
    onSuccess: (created) => {
      patchCategoryLists(queryClient, (list) => {
        if (list.some((item) => item.id === created.id)) {
          return list.map((item) => (item.id === created.id ? created : item))
        }
        return [...list, created].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
      })
      void queryClient.invalidateQueries({ queryKey: categoriesQueryKey })
    },
  })
}

export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CategoryUpdateInput }) =>
      updateCategory(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: categoriesQueryKey })
      const previous = queryClient.getQueriesData<Category[]>({ queryKey: categoriesQueryKey })

      patchCategoryLists(queryClient, (list) =>
        list.map((item) =>
          item.id === id
            ? {
                ...item,
                name: payload.name ?? item.name,
                active: payload.active ?? item.active,
                sort_order: payload.sort_order ?? item.sort_order,
              }
            : item
        )
      )

      return { previous }
    },
    onError: (_error, _vars, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    onSuccess: (updated) => {
      patchCategoryLists(queryClient, (list) =>
        list.map((item) => (item.id === updated.id ? updated : item))
      )
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: categoriesQueryKey })
    },
  })
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: categoriesQueryKey })
      const previous = queryClient.getQueriesData<Category[]>({ queryKey: categoriesQueryKey })
      patchCategoryLists(queryClient, (list) => list.filter((item) => item.id !== id))
      return { previous }
    },
    onError: (_error, _id, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: categoriesQueryKey })
    },
  })
}
