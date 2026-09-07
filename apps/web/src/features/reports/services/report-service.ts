import type {
  AccountStatementParams,
  AccountStatementResponse,
  InventoryMovementsParams,
  InventoryMovementsResponse,
  InventoryReportParams,
  InventoryReportResponse,
} from '@/features/reports/types'
import { api } from '@/lib/api'

function buildReportQueryParams(params: AccountStatementParams) {
  const search = new URLSearchParams()

  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  if (params.month) search.set('month', params.month)
  if (params.account_id != null) search.set('account_id', String(params.account_id))
  if (params.unassigned) search.set('unassigned', 'true')
  if (params.display_currency) search.set('display_currency', params.display_currency)
  if (params.types?.length) search.set('types', params.types.join(','))

  return search
}

export async function getAccountStatement(params: AccountStatementParams = {}) {
  const query = buildReportQueryParams(params)
  const url = query.size > 0 ? `/reports/account-statement?${query.toString()}` : '/reports/account-statement'
  const { data } = await api.get<AccountStatementResponse>(url)

  return data.data
}

function buildInventoryQueryParams(params: InventoryReportParams) {
  const search = new URLSearchParams()

  if (params.search) search.set('search', params.search)
  if (params.category) search.set('category', params.category)
  if (params.sort_by) search.set('sort_by', params.sort_by)
  if (params.sort_dir) search.set('sort_dir', params.sort_dir)
  if (params.active === false) search.set('active', 'false')
  if (params.active === true) search.set('active', 'true')
  if (params.low_stock) search.set('low_stock', 'true')
  if (params.hide_zero) search.set('hide_zero', 'true')
  if (params.page) search.set('page', String(params.page))
  if (params.per_page) search.set('per_page', String(params.per_page))
  if (params.export) search.set('export', 'true')

  return search
}

export async function getInventoryReport(params: InventoryReportParams = {}) {
  const query = buildInventoryQueryParams(params)
  const url = query.size > 0 ? `/reports/inventory?${query.toString()}` : '/reports/inventory'
  const { data } = await api.get<InventoryReportResponse>(url)
  return data.data
}

function buildInventoryMovementsQueryParams(params: InventoryMovementsParams) {
  const search = new URLSearchParams()

  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  if (params.month) search.set('month', params.month)
  if (params.page) search.set('page', String(params.page))
  if (params.per_page) search.set('per_page', String(params.per_page))
  if (params.export) search.set('export', 'true')
  if (params.types?.length) search.set('types', params.types.join(','))

  return search
}

export async function getInventoryProductMovements(
  productId: number,
  params: InventoryMovementsParams = {}
) {
  const query = buildInventoryMovementsQueryParams(params)
  const base = `/reports/inventory/${productId}/movements`
  const url = query.size > 0 ? `${base}?${query.toString()}` : base
  const { data } = await api.get<InventoryMovementsResponse>(url)
  return data.data
}
