import { api } from '@/lib/api'
import type { CostWarning } from '@/lib/cost-warnings'
import type {
  Formula,
  FormulaInput,
  FormulaListParams,
  FormulaListResponse,
  FormulaMaterialItem,
  FormulaMaterialsResponse,
  FormulaResponse,
} from '@/features/formulas/types'

export type FormulaMaterialsUpdateResult = {
  materials: FormulaMaterialItem[]
  costWarnings: CostWarning[]
}

export async function listFormulas(params: FormulaListParams = {}) {
  const { data } = await api.get<FormulaListResponse>('/formulas', {
    params: {
      page: params.page,
      per_page: params.perPage,
      search: params.search || undefined,
      active: params.active,
    },
  })

  return data.data
}

export async function getFormula(id: number) {
  const { data } = await api.get<FormulaResponse>(`/formulas/${id}`)
  return data.data.formula
}

export async function createFormula(payload: FormulaInput) {
  const { data } = await api.post<FormulaResponse>('/formulas', payload)
  return data.data.formula
}

export async function updateFormula(id: number, payload: Partial<FormulaInput>) {
  const { data } = await api.put<FormulaResponse>(`/formulas/${id}`, payload)
  return data.data.formula
}

export async function deleteFormula(id: number) {
  const { data } = await api.delete<{ data: { id: number } }>(`/formulas/${id}`)
  return data.data
}

export async function getFormulaMaterials(id: number) {
  const { data } = await api.get<FormulaMaterialsResponse>(`/formulas/${id}/materials`)
  return data.data.materials
}

export async function updateFormulaMaterials(
  id: number,
  items: { material_id: number; quantity: number }[]
): Promise<FormulaMaterialsUpdateResult> {
  const { data } = await api.put<{
    data: { materials: FormulaMaterialItem[]; cost_warnings?: CostWarning[] }
  }>(`/formulas/${id}/materials`, {
    items,
  })

  return {
    materials: data.data.materials,
    costWarnings: data.data.cost_warnings ?? [],
  }
}

export type { Formula, FormulaMaterialItem }
