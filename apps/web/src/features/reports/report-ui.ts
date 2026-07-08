import type { AccountStatementMovementType } from '@/features/reports/types'

/** Colores por tipo de movimiento (barras, gráficos, badges) */
export const movementTheme: Record<
  AccountStatementMovementType,
  { bar: string; chart: string; badge: string; label: string }
> = {
  sale: {
    bar: '#22c55e',
    chart: '#22c55e',
    badge: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    label: 'Ingreso',
  },
  customer_payment: {
    bar: '#16a34a',
    chart: '#16a34a',
    badge: 'bg-green-50 text-green-800 border border-green-200',
    label: 'Abono',
  },
  purchase: {
    bar: '#0d3d2e',
    chart: '#0d3d2e',
    badge: 'bg-[#ecf4f0] text-[#0d3d2e] border border-[#cfe0d8]',
    label: 'Compra',
  },
  supplier_payment: {
    bar: '#115e59',
    chart: '#0f766e',
    badge: 'bg-teal-50 text-teal-900 border border-teal-200',
    label: 'Pago',
  },
  expense: {
    bar: '#64748b',
    chart: '#64748b',
    badge: 'bg-slate-100 text-slate-700 border border-slate-200',
    label: 'Gasto',
  },
  machine_expense: {
    bar: '#14b8a6',
    chart: '#2dd4bf',
    badge: 'bg-teal-50 text-teal-800 border border-teal-200',
    label: 'Gasto máq.',
  },
}

export const chartSegmentColors: Record<string, string> = {
  sales: movementTheme.sale.chart,
  purchases: movementTheme.purchase.chart,
  expenses: movementTheme.expense.chart,
  machine: movementTheme.machine_expense.chart,
}

/** Tokens visuales — fondo blanco, acentos del sistema */
export const reportUi = {
  page: 'bg-white text-neutral-900',
  panel: 'rounded-2xl border border-neutral-200 bg-white shadow-sm',
  metricCard:
    'report-metric-card group block rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10',
  chip:
    'inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium tracking-wide text-neutral-600 uppercase',
  title: 'text-2xl font-semibold tracking-tight text-neutral-900 md:text-3xl',
  subtitle: 'text-sm text-neutral-600',
  sectionTitle: 'text-base font-semibold text-neutral-900',
  muted: 'text-xs text-neutral-500',
  body: 'text-sm text-neutral-700',
  value: 'font-semibold tabular-nums text-neutral-900',
  divider: 'border-neutral-200',
  pillTrack: 'inline-flex rounded-full bg-neutral-100 p-1',
  pillActive:
    'rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all',
  pillInactive:
    'rounded-full px-4 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-white hover:text-neutral-900',
  input:
    'h-9 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 shadow-none placeholder:text-neutral-400 focus-visible:border-neutral-900 focus-visible:ring-neutral-900/10',
  btnGhost:
    'rounded-lg border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50',
  badge: 'rounded-full bg-neutral-100 px-3 py-1 text-[10px] font-medium text-neutral-600',
  badgeOk: 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700',
  badgeWarn: 'rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700',
  error: 'rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 whitespace-pre-line',
  barTrack: 'h-3 overflow-hidden rounded-full bg-neutral-100',
  iconBoxIncome: 'flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700',
  iconBoxExpense: 'flex size-10 items-center justify-center rounded-2xl bg-red-50 text-red-600',
  iconBoxPurchase:
    'flex size-10 items-center justify-center rounded-2xl bg-[#ecf4f0] text-[#0d3d2e]',
  iconBoxMachine: 'flex size-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700',
  iconBoxNeutral: 'flex size-10 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-600',
  rowHover: 'transition-colors duration-500 ease-out hover:bg-neutral-50',
  income: 'font-semibold text-emerald-700',
  expense: 'font-semibold text-red-600',
  hero:
    'report-hero-kpi relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 p-6 text-white shadow-[0_2px_8px_-2px_rgb(0_0_0_/_0.12)]',
} as const

export type MetricTone = 'income' | 'purchase' | 'expense' | 'machine'

export function metricToneStyles(tone: MetricTone) {
  switch (tone) {
    case 'income':
      return {
        icon: reportUi.iconBoxIncome,
        tag: 'bg-emerald-50 text-emerald-700',
        tagLabel: 'Ingreso',
      }
    case 'purchase':
      return {
        icon: reportUi.iconBoxPurchase,
        tag: 'bg-[#ecf4f0] text-[#0d3d2e]',
        tagLabel: 'Egreso',
      }
    case 'machine':
      return {
        icon: reportUi.iconBoxMachine,
        tag: 'bg-teal-50 text-teal-800',
        tagLabel: 'Egreso',
      }
    default:
      return {
        icon: reportUi.iconBoxExpense,
        tag: 'bg-red-50 text-red-600',
        tagLabel: 'Egreso',
      }
  }
}
