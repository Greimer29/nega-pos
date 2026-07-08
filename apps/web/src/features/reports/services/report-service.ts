import type { AccountStatementParams, AccountStatementResponse } from '@/features/reports/types'
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
