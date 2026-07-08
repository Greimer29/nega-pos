import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCatalogProduct,
  deleteCatalogProduct,
  deleteCatalogImage,
  getCatalogProduct,
  listCatalogProducts,
  updateCatalogProduct,
  uploadCatalogImage,
  ajustarStockProducto,
} from '@/features/ventas/services/catalog-service'
import type { CatalogListParams, CatalogProductInput } from '@/features/ventas/types'
import { invalidateStockMovement } from '@/lib/query-invalidation'

export function useCatalogProductsQuery(params: CatalogListParams = {}) {
  return useQuery({
    queryKey: ['catalog-products', params],
    queryFn: () => listCatalogProducts(params),
  })
}

export function useCatalogProductQuery(id: number | undefined) {
  return useQuery({
    queryKey: ['catalog-products', id],
    queryFn: () => getCatalogProduct(id!),
    enabled: id !== undefined && Number.isFinite(id) && id > 0,
  })
}

export function useCreateCatalogProductMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CatalogProductInput) => createCatalogProduct(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog-products'] })
    },
  })
}

export function useUpdateCatalogProductMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CatalogProductInput> }) =>
      updateCatalogProduct(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['catalog-products'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog-products', id] })
    },
  })
}

export function useDeleteCatalogProductMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteCatalogProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog-products'] })
    },
  })
}

export function useUploadCatalogImageMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => uploadCatalogImage(id, file),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['catalog-products', id] })
      void queryClient.invalidateQueries({ queryKey: ['catalog-products'] })
    },
  })
}

export function useDeleteCatalogImageMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteCatalogImage(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: ['catalog-products', id] })
      void queryClient.invalidateQueries({ queryKey: ['catalog-products'] })
    },
  })
}

export function useAjusteStockProductoMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: { mode: 'CARGO' | 'DESCARGO' | 'AJUSTE'; quantity: number; note?: string }
    }) => ajustarStockProducto(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['catalog-products', id] })
      void queryClient.invalidateQueries({ queryKey: ['catalog-products'] })
      invalidateStockMovement(queryClient)
    },
  })
}
