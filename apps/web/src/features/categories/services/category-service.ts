import type {
  Category,
  CategoryInput,
  CategoryListResponse,
  CategoryResponse,
  CategoryUpdateInput,
} from '@/features/categories/types'
import { api } from '@/lib/api'

export async function listCategories(activeOnly = false) {
  const { data } = await api.get<CategoryListResponse>('/categories', {
    params: { active_only: activeOnly || undefined },
  })
  return data.data.categories
}

export async function createCategory(payload: CategoryInput) {
  const { data } = await api.post<CategoryResponse>('/categories', payload)
  return data.data.category as Category
}

export async function updateCategory(id: number, payload: CategoryUpdateInput) {
  const { data } = await api.put<CategoryResponse>(`/categories/${id}`, payload)
  return data.data.category as Category
}

export async function deleteCategory(id: number) {
  await api.delete(`/categories/${id}`)
}
