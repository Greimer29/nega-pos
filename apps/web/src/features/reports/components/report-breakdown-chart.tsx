import { formatMoney } from '@/features/reports/constants'
import { chartSegmentColors, reportUi } from '@/features/reports/report-ui'
import type { AccountStatementSummary } from '@/features/reports/types'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Segment = {
  key: string
  label: string
  value: number
  color: string
  isIncome: boolean
}

type ReportBreakdownChartProps = {
  summary: AccountStatementSummary
}

export function ReportBreakdownChart({ summary }: ReportBreakdownChartProps) {
  const currency = summary.displayCurrency

  const rawSegments: Array<Omit<Segment, 'color'>> = [
    { key: 'sales', label: 'Ventas', value: Number(summary.sales), isIncome: true },
    { key: 'purchases', label: 'Compras', value: Number(summary.purchases), isIncome: false },
    { key: 'expenses', label: 'Gastos empresa', value: Number(summary.expenses), isIncome: false },
    {
      key: 'machine',
      label: 'Gastos máquina',
      value: Number(summary.machineExpenses),
      isIncome: false,
    },
  ]

  const segments: Segment[] = rawSegments
    .filter((segment) => segment.value > 0)
    .map((segment) => ({
      ...segment,
      color: chartSegmentColors[segment.key] ?? '#64748b',
    }))

  const total = segments.reduce((sum, segment) => sum + segment.value, 0)

  if (total === 0) {
    return (
      <ChartShell title="Composición del flujo" subtitle={`Distribución en ${currency}`}>
        <p className={`${reportUi.body} flex flex-1 items-center justify-center py-12`}>
          Sin movimientos en el período.
        </p>
      </ChartShell>
    )
  }

  let cumulative = 0
  const gradientStops = segments
    .map((segment) => {
      const start = (cumulative / total) * 100
      cumulative += segment.value
      const end = (cumulative / total) * 100
      return `${segment.color} ${start}% ${end}%`
    })
    .join(', ')

  return (
    <ChartShell title="Composición del flujo" subtitle={`Distribución en ${currency}`}>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="relative mx-auto size-44 shrink-0">
          <div
            className="size-full rounded-full"
            style={{ background: `conic-gradient(${gradientStops})` }}
          />
          <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full border border-neutral-100 bg-white text-center shadow-inner">
            <p className={cn(reportUi.muted, 'font-medium uppercase tracking-wide')}>Total</p>
            <p className={`text-lg font-bold ${reportUi.value}`}>{formatMoney(total, currency)}</p>
          </div>
        </div>

        <ul className="flex-1 space-y-3">
          {segments.map((segment) => {
            const pct = ((segment.value / total) * 100).toFixed(1)

            return (
              <li key={segment.key} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className={reportUi.body}>{segment.label}</span>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      segment.isIncome ? reportUi.income : reportUi.expense
                    )}
                  >
                    {formatMoney(segment.value, currency)}
                  </p>
                  <p className={`${reportUi.muted} tabular-nums`}>{pct}%</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </ChartShell>
  )
}

function ChartShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className={cn(reportUi.panel, 'flex h-full flex-col p-5 md:p-6')}>
      <div className="mb-5">
        <h3 className={reportUi.sectionTitle}>{title}</h3>
        <p className={reportUi.muted}>{subtitle}</p>
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  )
}
