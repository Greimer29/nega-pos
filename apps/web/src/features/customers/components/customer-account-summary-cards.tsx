import type { ReactNode } from 'react'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { CustomerSalesBreakdownDonut } from '@/features/customers/components/customer-sales-breakdown-donut'
import type { CustomerAccountSummary } from '@/features/customers/utils/customer-account-summary'
import { DashboardProfitDonut } from '@/features/dashboard/components/dashboard-profit-donut'
import { dashboardUi } from '@/features/dashboard/dashboard-ui'
import { cn } from '@/lib/utils'

type CustomerAccountSummaryCardsProps = {
  summary: CustomerAccountSummary
}

type CustomerAccountCardTheme = 'emerald' | 'blue' | 'wine'

const customerAccountCardThemes: Record<
  CustomerAccountCardTheme,
  { card: string; glow: string; glowAlt: string }
> = {
  emerald: {
    card: 'bg-gradient-to-br from-neutral-950 via-[#071a14] to-[#0d3d2e]',
    glow: 'bg-[#0d3d2e]/90',
    glowAlt: 'bg-emerald-800/35',
  },
  blue: {
    card: 'bg-gradient-to-br from-neutral-950 via-[#0a1528] to-blue-950',
    glow: 'bg-blue-600/55',
    glowAlt: 'bg-sky-900/45',
  },
  wine: {
    card: 'bg-gradient-to-br from-neutral-950 via-[#12090e] to-[#2b0812]',
    glow: 'bg-[#7f1d3a]/35',
    glowAlt: 'bg-[#881337]/22',
  },
}

function CustomerAccountCardShell({
  children,
  theme = 'emerald',
}: {
  children: ReactNode
  theme?: CustomerAccountCardTheme
}) {
  const styles = customerAccountCardThemes[theme]

  return (
    <div className={dashboardUi.topGridCell}>
      <div
        className={cn(
          'relative flex h-full min-h-0 flex-col overflow-hidden rounded-3xl p-6 text-white shadow-lg md:p-8',
          styles.card
        )}
      >
        <div
          className={cn(
            'pointer-events-none absolute -right-8 -top-8 size-40 rounded-full blur-2xl',
            styles.glow
          )}
        />
        <div
          className={cn(
            'pointer-events-none absolute -bottom-16 -left-10 size-56 rounded-full blur-3xl',
            styles.glowAlt
          )}
        />
        <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  )
}

function CustomerAccountMetricLayout({
  metrics,
  chart,
}: {
  metrics: ReactNode
  chart: ReactNode
}) {
  return (
    <div className="flex items-start justify-start gap-4">
      <div className="min-w-0 flex-[3]">{metrics}</div>
      <div className="flex flex-[1] items-center justify-end">{chart}</div>
    </div>
  )
}

function CustomerAccountKpiCard({
  title,
  amountUsd,
  detail,
  percent,
  ariaLabel,
  theme,
}: {
  title: string
  amountUsd: number
  detail?: string
  percent: number
  ariaLabel: string
  theme: CustomerAccountCardTheme
}) {
  return (
    <CustomerAccountCardShell theme={theme}>
      <CustomerAccountMetricLayout
        metrics={
          <div className="space-y-2">
            <p className="text-sm text-white/70">{title}</p>
            <DisplayMoneyFromUsd
              amountUsd={amountUsd}
              className="text-[1.6rem] font-bold text-white md:text-[2rem]"
            />
            {detail ? (
              <p className="text-sm tabular-nums text-white/80">{detail}</p>
            ) : null}
          </div>
        }
        chart={<DashboardProfitDonut percent={percent} size={100} ariaLabel={ariaLabel} />}
      />
    </CustomerAccountCardShell>
  )
}

export function CustomerAccountSummaryCards({ summary }: CustomerAccountSummaryCardsProps) {
  const { facturado, abonado, pendiente } = summary

  return (
    <div className={dashboardUi.topGridRow}>
      <CustomerAccountCardShell theme="emerald">
        <CustomerAccountMetricLayout
          metrics={
            <div className="space-y-3">
              <p className="text-sm text-white/70">Facturado</p>
              <DisplayMoneyFromUsd
                amountUsd={facturado.montoUsd}
                className="text-[1.6rem] font-bold text-white md:text-[2rem]"
              />
              <p className="text-sm tabular-nums text-white/80">
                Nº Op: {facturado.operacionesTotal.toLocaleString('es-VE')}
              </p>
            </div>
          }
          chart={
            <CustomerSalesBreakdownDonut
              totalUsd={facturado.montoUsd}
              pagadoUsd={facturado.pagadoUsd}
              creditoUsd={facturado.creditoSaldoUsd}
              size={100}
              compact
            />
          }
        />
      </CustomerAccountCardShell>

      <CustomerAccountKpiCard
        title="Abonado"
        amountUsd={abonado.montoUsd}
        detail={`Nº Op: ${abonado.operaciones.toLocaleString('es-VE')}`}
        percent={abonado.porcentajeSobreFacturado}
        ariaLabel={`${abonado.porcentajeSobreFacturado.toFixed(1)}% abonado sobre ventas facturadas`}
        theme="blue"
      />

      <CustomerAccountKpiCard
        title="Pendiente"
        amountUsd={pendiente.montoUsd}
        percent={pendiente.porcentajeSobreFacturado}
        ariaLabel={`${pendiente.porcentajeSobreFacturado.toFixed(1)}% pendiente sobre ventas facturadas`}
        theme="wine"
      />
    </div>
  )
}
