import { api } from '@/lib/api'
import type {
  CatalogListParams,
  CatalogListResponse,
  CatalogProduct,
  CatalogProductInput,
  CatalogProductResponse,
} from '@/features/ventas/types'
import type { CostWarning } from '@/lib/cost-warnings'

export async function listCatalogProducts(params: CatalogListParams = {}) {
  const { data } = await api.get<CatalogListResponse>('/catalog-products', {
    params: {
      page: params.page,
      per_page: params.perPage,
      search: params.search || undefined,
      category: params.category,
      active: params.active,
      sort_by: params.sortBy,
      sort_dir: params.sortDir,
    },
  })

  return data.data
}

export async function getCatalogProduct(id: number) {
  const { data } = await api.get<CatalogProductResponse>(`/catalog-products/${id}`)
  return data.data.catalog_product
}

export async function createCatalogProduct(payload: CatalogProductInput) {
  const { data } = await api.post<CatalogProductResponse>('/catalog-products', payload)
  return data.data.catalog_product
}

export async function updateCatalogProduct(id: number, payload: Partial<CatalogProductInput>) {
  const { data } = await api.put<{
    data: { catalog_product: CatalogProduct; cost_warnings?: CostWarning[] }
  }>(`/catalog-products/${id}`, payload)

  return {
    catalogProduct: data.data.catalog_product,
    costWarnings: data.data.cost_warnings ?? [],
  }
}

export async function deleteCatalogProduct(id: number) {
  const { data } = await api.delete<{ data: { id: number; modo: 'soft' | 'hard' } }>(
    `/catalog-products/${id}`
  )
  return data.data
}

export async function uploadCatalogImage(id: number, file: File) {
  const formData = new FormData()
  formData.append('image', file)

  const { data } = await api.post<CatalogProductResponse>(
    `/catalog-products/${id}/image`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )

  return data.data.catalog_product
}

export async function deleteCatalogImage(id: number) {
  const { data } = await api.delete<CatalogProductResponse>(`/catalog-products/${id}/image`)
  return data.data.catalog_product
}

export async function ajustarStockProducto(
  id: number,
  payload: { mode: 'CARGO' | 'DESCARGO' | 'AJUSTE'; quantity: number; note?: string }
) {
  const { data } = await api.post<{
    data: { movimiento: import('@/features/ventas/types').ProductInventoryMovement }
  }>(`/catalog-products/${id}/adjustment`, payload)
  return data.data.movimiento
}

export type { CatalogProduct }
