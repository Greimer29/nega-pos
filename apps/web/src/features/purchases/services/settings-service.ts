import { api } from '@/lib/api'

type ExchangeRateResponse = {
  data: {
    usdRate: string | null
  }
}

type ProfitMarginResponse = {
  data: {
    profitMarginPercent: string | null
  }
}

export async function getExchangeRate() {
  const { data } = await api.get<ExchangeRateResponse>('/settings/exchange-rate')
  return data.data.usdRate
}

export async function updateExchangeRate(usd_rate: number) {
  const { data } = await api.put<ExchangeRateResponse>('/settings/exchange-rate', { usd_rate })
  return data.data.usdRate
}

export async function getProfitMargin() {
  const { data } = await api.get<ProfitMarginResponse>('/settings/profit-margin')
  return data.data.profitMarginPercent
}

export async function updateProfitMargin(profit_margin_percent: number) {
  const { data } = await api.put<ProfitMarginResponse>('/settings/profit-margin', {
    profit_margin_percent,
  })
  return data.data.profitMarginPercent
}

export type ApplyProfitMarginInput = {
  catalog_product_ids: number[]
  profit_margin_percent: number
}

export type ApplyProfitMarginSkipped = {
  id: number
  name: string
  reason: 'NO_COST_PRICE' | 'NOT_FOUND'
}

export type ApplyProfitMarginResult = {
  updatedCount: number
  skipped: ApplyProfitMarginSkipped[]
}

type ApplyProfitMarginResponse = {
  data: ApplyProfitMarginResult
}

export async function applyProfitMargin(payload: ApplyProfitMarginInput) {
  const { data } = await api.post<ApplyProfitMarginResponse>(
    '/catalog-products/apply-profit-margin',
    payload
  )
  return data.data
}
