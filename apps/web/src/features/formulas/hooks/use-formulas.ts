import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createFormula,
  deleteFormula,
  getFormula,
  getFormulaMaterials,
  listFormulas,
  updateFormula,
  updateFormulaMaterials,
} from '@/features/formulas/services/formula-service'
import type { FormulaInput, FormulaListParams } from '@/features/formulas/types'

export function useFormulasQuery(params: FormulaListParams = {}) {
  return useQuery({
    queryKey: ['formulas', params],
    queryFn: () => listFormulas(params),
  })
}

export function useFormulaQuery(id: number | undefined) {
  return useQuery({
    queryKey: ['formulas', id],
    queryFn: () => getFormula(id!),
    enabled: id !== undefined,
  })
}

export function useFormulaMaterialsQuery(id: number | undefined) {
  return useQuery({
    queryKey: ['formulas', id, 'materials'],
    queryFn: () => getFormulaMaterials(id!),
    enabled: id !== undefined,
  })
}

export function useCreateFormulaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: FormulaInput) => createFormula(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['formulas'] })
    },
  })
}

export function useUpdateFormulaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<FormulaInput> }) =>
      updateFormula(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['formulas'] })
      void queryClient.invalidateQueries({ queryKey: ['formulas', id] })
      void queryClient.invalidateQueries({ queryKey: ['catalog-products'] })
    },
  })
}

export function useDeleteFormulaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteFormula(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['formulas'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog-products'] })
    },
  })
}

export function useUpdateFormulaMaterialsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      items,
    }: {
      id: number
      items: { material_id: number; quantity: number }[]
    }) => updateFormulaMaterials(id, items),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['formulas'] })
      void queryClient.invalidateQueries({ queryKey: ['formulas', id] })
      void queryClient.invalidateQueries({ queryKey: ['formulas', id, 'materials'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog-products'] })
    },
  })
}
