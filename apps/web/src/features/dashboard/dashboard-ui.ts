export const dashboardUi = {
  page: 'flex flex-col gap-6',
  topGridRow: 'grid gap-4 xl:grid-cols-3 xl:items-stretch',
  topGridCell: 'flex min-h-0 flex-col',
  heroCard:
    'relative flex h-full min-h-0 flex-col overflow-hidden rounded-3xl bg-[#0d3d2e] p-6 text-white shadow-lg md:p-8',
  heroGlow: 'pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-white/10 blur-2xl',
  metricCard: 'rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm',
  metricCardFill: 'flex h-full min-h-0 flex-col rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm',
  sectionTitle: 'text-base font-semibold text-neutral-900',
  muted: 'text-sm text-neutral-500',
  chip:
    'inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800',
  chipDanger:
    'inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700',
  chartBody: 'flex min-h-0 flex-1 flex-col gap-2',
  chartPlotRow: 'flex min-h-0 flex-1 items-stretch gap-1',
  chartYAxis: 'relative w-11 min-h-[140px] shrink-0 self-stretch',
  chartYAxisTick:
    'absolute right-0 max-w-10 -translate-y-1/2 truncate text-right text-[9px] leading-none tabular-nums text-neutral-500',
  chartPlotCanvas: 'relative min-h-[140px] flex-1 self-stretch',
  chartGridLine: 'pointer-events-none absolute inset-x-0 border-t border-neutral-100',
  chartBarsLayer: 'absolute inset-0 flex items-end justify-around gap-1 px-1',
  chartBarSlot: 'group relative flex h-full flex-1 items-end justify-center',
  chartXRow: 'flex justify-around gap-1 pl-12',
  chartXLabel: 'min-w-0 flex-1 truncate text-center text-[10px] text-neutral-500',
  bar: 'w-full max-w-7 rounded-full bg-[#0d3d2e] transition-all',
  barMuted: 'w-full max-w-7 rounded-full bg-neutral-200 transition-all',
  chartTooltip:
    'pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-neutral-200 bg-white px-2 py-1 text-[10px] font-medium text-neutral-900 opacity-0 shadow-md transition-opacity group-hover:opacity-100',
  table: 'w-full text-sm',
}
