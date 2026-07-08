import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { DashboardProfitDonut } from '@/features/dashboard/components/dashboard-profit-donut'
import type { GananciaDelDia, VentasDelDia } from '@/features/dashboard/types'
import { dashboardUi } from '@/features/dashboard/dashboard-ui'

type DashboardDailySalesCardProps = {
  ventas: VentasDelDia
  ganancia: GananciaDelDia
}

function parseUsd(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') {
    return 0
  }

  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

export function DashboardDailySalesCard({ ventas, ganancia }: DashboardDailySalesCardProps) {
  const brutoUsd = parseUsd(ventas.montoProductosUsd)
  const creditoUsd = parseUsd(ventas.montoCreditoUsd)
  const gastosUsd = parseUsd(ventas.gastosMontoUsd)
  const entradasNetasUsd = brutoUsd - gastosUsd - creditoUsd

  return (
    <div className={dashboardUi.heroCard}>
      <div className={dashboardUi.heroGlow} />
      <div className="relative flex min-h-0 flex-1 flex-col justify-between gap-6">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-white/70">Entradas netas del día</p>
            <div className="mt-2">
              <DisplayMoneyFromUsd
                amountUsd={entradasNetasUsd}
                className="text-[1.8rem] font-bold text-white md:text-[2.4rem]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/dashboard/productos-vendidos-hoy"
              className="group space-y-1 rounded-xl transition-colors hover:bg-white/5"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-white/70">Productos vendidos</p>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/80 transition-colors group-hover:bg-white/15 group-hover:text-white">
                  <ArrowUpRight className="size-4" aria-hidden />
                </span>
              </div>
              <DisplayMoneyFromUsd
                amountUsd={ventas.montoProductosUsd}
                className="text-[1.2rem] font-semibold text-white"
              />
              <p className="text-sm tabular-nums text-white/80">
                {ventas.productosVendidos.toLocaleString('es-VE')}
              </p>
            </Link>
            <Link
              to="/dashboard/gastos-del-dia"
              className="group space-y-1 rounded-xl transition-colors hover:bg-white/5"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-white/70">Gastos del día</p>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/80 transition-colors group-hover:bg-white/15 group-hover:text-white">
                  <ArrowUpRight className="size-4" aria-hidden />
                </span>
              </div>
              <DisplayMoneyFromUsd
                amountUsd={ventas.gastosMontoUsd}
                className="text-[1.2rem] font-semibold text-white"
              />
              <p className="text-sm tabular-nums text-white/80">
                {ventas.gastosCantidad.toLocaleString('es-VE')}
              </p>
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl bg-white/10 p-3">
            <div>
              <p className="text-sm text-white/70">Facturado a crédito</p>
              <p className="text-lg font-semibold">
                <DisplayMoneyFromUsd
                  amountUsd={creditoUsd}
                  size="md"
                  className="text-white"
                />
              </p>
              {ventas.pedidosCredito > 0 ? (
                <p className="text-xs tabular-nums text-white/70">
                  {ventas.pedidosCredito.toLocaleString('es-VE')}{' '}
                  {ventas.pedidosCredito === 1 ? 'pedido' : 'pedidos'}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-white/10 p-3">
            <div>
              <p className="text-sm text-white/70">Ganancia del día</p>
              <p className="text-lg font-semibold">
                <DisplayMoneyFromUsd amountUsd={ganancia.montoUsd} size="md" className="text-white" />
              </p>
            </div>
            <DashboardProfitDonut percent={ganancia.porcentajeSobreVentas} />
          </div>
        </div>
      </div>
    </div>
  )
}
