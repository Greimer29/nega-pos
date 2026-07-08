import type { CostWarning } from '@/lib/cost-warnings'
import { api } from '@/lib/api'
import type {
  AjusteStockInput,
  AjusteStockResponse,
  HistorialPreciosResponse,
  Material,
  MaterialDeleteResponse,
  MaterialInput,
  MaterialListParams,
  MaterialListResponse,
  MaterialResponse,
} from '@/features/materials/types'

export async function listMaterials(params: MaterialListParams = {}) {
  const { data } = await api.get<MaterialListResponse>('/materials', {
    params: {
      page: params.page,
      per_page: params.perPage,
      search: params.search || undefined,
      category: params.category,
      status: params.status || undefined,
      sort_by: params.sortBy,
      sort_dir: params.sortDir,
      low_stock: params.lowStock,
    },
  })

  return data.data
}

export async function getMaterial(id: number) {
  const { data } = await api.get<MaterialResponse>(`/materials/${id}`)
  return data.data.material
}

export async function createMaterial(payload: MaterialInput) {
  const { data } = await api.post<MaterialResponse>('/materials', payload)
  return data.data.material
}

export async function updateMaterial(id: number, payload: MaterialInput) {
  const { data } = await api.put<{
    data: { material: Material; cost_warnings?: CostWarning[] }
  }>(`/materials/${id}`, payload)

  return {
    material: data.data.material,
    costWarnings: data.data.cost_warnings ?? [],
  }
}

export async function deleteMaterial(id: number) {
  const { data } = await api.delete<MaterialDeleteResponse>(`/materials/${id}`)
  return data.data
}

export async function ajustarStock(id: number, payload: AjusteStockInput) {
  const { data } = await api.post<AjusteStockResponse>(`/materials/${id}/adjustment`, payload)
  return data.data
}

export async function getHistorialPrecios(id: number) {
  const { data } = await api.get<HistorialPreciosResponse>(`/materials/${id}/price-history`)
  return data.data.historial
}

export async function uploadMaterialImage(id: number, file: File) {
  const formData = new FormData()
  formData.append('image', file)

  const { data } = await api.post<MaterialResponse>(`/materials/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return data.data.material
}

export async function deleteMaterialImage(id: number) {
  const { data } = await api.delete<MaterialResponse>(`/materials/${id}/image`)
  return data.data.material
}
