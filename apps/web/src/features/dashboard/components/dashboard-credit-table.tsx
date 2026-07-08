import { Link } from 'react-router-dom'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { dashboardUi } from '@/features/dashboard/dashboard-ui'
import { cn } from '@/lib/utils'

type CreditRow = {
  id: number
  name: string
  saldoPendienteUsd: string
  estado: 'vigente' | 'vencida'
  pedidosConSaldo?: number
}

type DashboardCreditTableProps = {
  title: string
  description: string
  rows: CreditRow[]
  linkBase: string
  linkSuffix?: string
  showOrders?: boolean
}

export function DashboardCreditTable({
  title,
  description,
  rows,
  linkBase,
  linkSuffix = '',
  showOrders = false,
}: DashboardCreditTableProps) {
  return (
    <div className={dashboardUi.metricCard}>
      <div className="mb-4">
        <h3 className={dashboardUi.sectionTitle}>{title}</h3>
        <p className={dashboardUi.muted}>{description}</p>
      </div>
      {rows.length === 0 ? (
        <p className={dashboardUi.muted}>Sin saldos pendientes.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className={dashboardUi.table}>
            <thead>
              <tr className="border-b text-left text-neutral-500">
                <th className="pb-2 font-medium">Nombre</th>
                {showOrders ? <th className="pb-2 font-medium">Pedidos</th> : null}
                <th className="pb-2 font-medium text-right">Saldo</th>
                <th className="pb-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-b-0">
                  <td className="py-3 pr-3">
                    <Link
                      to={`${linkBase}/${row.id}${linkSuffix}`}
                      className="font-medium hover:underline"
                    >
                      {row.name}
                    </Link>
                  </td>
                  {showOrders ? (
                    <td className="py-3 pr-3 tabular-nums">{row.pedidosConSaldo ?? 0}</td>
                  ) : null}
                  <td className="py-3 pr-3 text-right">
                    <DisplayMoneyFromUsd amountUsd={row.saldoPendienteUsd} />
                  </td>
                  <td className="py-3">
                    <span
                      className={cn(
                        row.estado === 'vencida' ? dashboardUi.chipDanger : dashboardUi.chip
                      )}
                    >
                      {row.estado === 'vencida' ? 'Vencida' : 'Vigente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
