import type {
  Currency,
  CurrencyInput,
  CurrencyListResponse,
  CurrencyResponse,
  CurrencyUpdateInput,
} from '@/features/currencies/types'
import { api } from '@/lib/api'

export async function listCurrencies(activeOnly = false) {
  const { data } = await api.get<CurrencyListResponse>('/currencies', {
    params: { active: activeOnly || undefined },
  })
  return data.data.currencies
}

export async function createCurrency(payload: CurrencyInput) {
  const { data } = await api.post<CurrencyResponse>('/currencies', payload)
  return data.data.currency as Currency
}

export async function updateCurrency(code: string, payload: CurrencyUpdateInput) {
  const { data } = await api.put<CurrencyResponse>(`/currencies/${code}`, payload)
  return data.data.currency as Currency
}

export async function deleteCurrency(code: string) {
  await api.delete(`/currencies/${code}`)
}
