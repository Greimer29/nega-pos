import { currentMonthIso, formatFecha, todayIso } from '@/features/reports/constants'
import type { AccountStatementParams } from '@/features/reports/types'

export type ReportPeriodMode = 'month' | 'day' | 'range'

export type ReportPeriodState = {
  mode: ReportPeriodMode
  month: string
  date: string
  from: string
  to: string
}

export function defaultReportPeriodState(): ReportPeriodState {
  const today = todayIso()
  return {
    mode: 'month',
    month: currentMonthIso(),
    date: today,
    from: today,
    to: today,
  }
}

export function periodStateToAccountParams(
  state: ReportPeriodState
): Pick<AccountStatementParams, 'month' | 'from' | 'to'> {
  if (state.mode === 'day' && state.date) {
    return { from: state.date, to: state.date }
  }
  if (state.mode === 'range') {
    return { from: state.from || undefined, to: state.to || undefined }
  }
  return { month: state.month }
}

export function parsePeriodFromSearchParams(searchParams: URLSearchParams): ReportPeriodState {
  const day = searchParams.get('day') === '1'
  const date = searchParams.get('date') ?? ''
  const range = searchParams.get('range') === '1'
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const month = searchParams.get('month') ?? currentMonthIso()

  if (day && date) {
    return { mode: 'day', month, date, from: date, to: date }
  }

  if (range) {
    const today = todayIso()
    return { mode: 'range', month, date: today, from: from || today, to: to || today }
  }

  return { mode: 'month', month, date: todayIso(), from: todayIso(), to: todayIso() }
}

export function applyPeriodToSearchParams(
  params: URLSearchParams,
  state: ReportPeriodState
): URLSearchParams {
  params.delete('month')
  params.delete('range')
  params.delete('day')
  params.delete('date')
  params.delete('from')
  params.delete('to')

  if (state.mode === 'day' && state.date) {
    params.set('day', '1')
    params.set('date', state.date)
    params.set('from', state.date)
    params.set('to', state.date)
    params.set('range', '1')
  } else if (state.mode === 'range') {
    params.set('range', '1')
    if (state.from) params.set('from', state.from)
    if (state.to) params.set('to', state.to)
  } else {
    params.set('month', state.month)
  }

  return params
}

export function periodLabelFromState(state: ReportPeriodState): string {
  if (state.mode === 'day' && state.date) {
    return formatFecha(state.date)
  }
  if (state.mode === 'range' && state.from && state.to) {
    return `${formatFecha(state.from)} — ${formatFecha(state.to)}`
  }
  const [year, monthNum] = state.month.split('-')
  const date = new Date(Number(year), Number(monthNum) - 1, 1)
  return date.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })
}
