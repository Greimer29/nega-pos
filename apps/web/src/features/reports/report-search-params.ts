import type { ReportMovementCategorySlug } from '@/features/reports/report-categories'
import { getReportCategory } from '@/features/reports/report-categories'
import {
  applyPeriodToSearchParams,
  defaultReportPeriodState,
  parsePeriodFromSearchParams,
  periodLabelFromState,
  periodStateToAccountParams,
  type ReportPeriodState,
} from '@/features/reports/report-period'
import type { AccountStatementParams } from '@/features/reports/types'

export type ReportFilterState = {
  period: ReportPeriodState
  accountId: number | null
  unassignedOnly: boolean
  displayCurrency: string
}

export function buildReportSearchParams(state: ReportFilterState): string {
  const params = applyPeriodToSearchParams(new URLSearchParams(), state.period)

  if (state.unassignedOnly) {
    params.set('unassigned', '1')
  } else if (state.accountId != null) {
    params.set('account_id', String(state.accountId))
  }

  if (state.displayCurrency) {
    params.set('display_currency', state.displayCurrency)
  }

  return params.toString()
}

export function parseReportSearchParams(
  searchParams: URLSearchParams,
  categorySlug: ReportMovementCategorySlug
): AccountStatementParams {
  const category = getReportCategory(categorySlug)
  const period = parsePeriodFromSearchParams(searchParams)
  const accountIdRaw = searchParams.get('account_id')
  const unassigned = searchParams.get('unassigned') === '1'
  const displayCurrency = searchParams.get('display_currency') ?? undefined

  return {
    ...periodStateToAccountParams(period),
    account_id: unassigned ? undefined : accountIdRaw ? Number(accountIdRaw) : undefined,
    unassigned: unassigned || undefined,
    display_currency: displayCurrency,
    types: category ? [category.apiType] : undefined,
  }
}

export function periodLabelFromSearchParams(searchParams: URLSearchParams): string {
  return periodLabelFromState(parsePeriodFromSearchParams(searchParams))
}

export { defaultReportPeriodState, parsePeriodFromSearchParams, periodLabelFromState }
export type { ReportPeriodState }
