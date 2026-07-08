import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ajustarStock,
  createMaterial,
  deleteMaterial,
  deleteMaterialImage,
  getHistorialPrecios,
  getMaterial,
  listMaterials,
  updateMaterial,
  uploadMaterialImage,
} from '@/features/materials/services/material-service'
import type { AjusteStockInput, MaterialInput, MaterialListParams } from '@/features/materials/types'
import { invalidateStockMovement } from '@/lib/query-invalidation'

export const materialsQueryKey = ['materials'] as const

export function useMaterialsQuery(params: MaterialListParams) {
  return useQuery({
    queryKey: [...materialsQueryKey, params],
    queryFn: () => listMaterials(params),
  })
}

export function useMaterialQuery(id: number) {
  return useQuery({
    queryKey: [...materialsQueryKey, 'detail', id],
    queryFn: () => getMaterial(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

export function useCreateMaterialMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: MaterialInput) => createMaterial(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: materialsQueryKey })
    },
  })
}

export function useUpdateMaterialMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: MaterialInput }) =>
      updateMaterial(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: materialsQueryKey })
      void queryClient.invalidateQueries({ queryKey: [...materialsQueryKey, 'detail', id] })
      void queryClient.invalidateQueries({ queryKey: ['catalog-products'] })
    },
  })
}

export function useDeleteMaterialMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteMaterial(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: materialsQueryKey })
    },
  })
}

export function useAjusteStockMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AjusteStockInput }) =>
      ajustarStock(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: materialsQueryKey })
      void queryClient.invalidateQueries({ queryKey: [...materialsQueryKey, 'detail', id] })
      invalidateStockMovement(queryClient)
    },
  })
}

export function useHistorialPreciosQuery(materialId: number) {
  return useQuery({
    queryKey: [...materialsQueryKey, 'historial', materialId],
    queryFn: () => getHistorialPrecios(materialId),
    enabled: Number.isFinite(materialId) && materialId > 0,
  })
}

export function useUploadMaterialImageMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => uploadMaterialImage(id, file),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: materialsQueryKey })
      void queryClient.invalidateQueries({ queryKey: [...materialsQueryKey, 'detail', id] })
    },
  })
}

export function useDeleteMaterialImageMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteMaterialImage(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: materialsQueryKey })
      void queryClient.invalidateQueries({ queryKey: [...materialsQueryKey, 'detail', id] })
    },
  })
}
