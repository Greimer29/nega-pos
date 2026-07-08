import { Link } from 'react-router-dom'
import type { BajoStockProductoItem } from '@/features/dashboard/types'
import { dashboardUi } from '@/features/dashboard/dashboard-ui'
import { cn } from '@/lib/utils'

type DashboardLowStockListProps = {
  products: BajoStockProductoItem[]
}

export function DashboardLowStockList({ products }: DashboardLowStockListProps) {
  return (
    <div className={dashboardUi.metricCardFill}>
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <div>
          <h3 className={dashboardUi.sectionTitle}>Productos con bajo stock</h3>
          <p className={dashboardUi.muted}>Por debajo del mínimo configurado</p>
        </div>
        <Link to="/productos" className="text-sm font-medium text-[#0d3d2e] hover:underline">
          Ver catálogo
        </Link>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {products.length === 0 ? (
          <p className={cn(dashboardUi.muted, 'flex flex-1 items-center justify-center py-6')}>
            No hay productos con bajo stock.
          </p>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/productos/${product.id}`}
                className="flex items-center justify-between rounded-2xl border border-neutral-100 px-3 py-2 hover:bg-neutral-50"
              >
                <span className="truncate font-medium text-neutral-900">{product.name}</span>
                <span className="shrink-0 text-sm tabular-nums text-neutral-600">
                  {Number(product.stock).toLocaleString('es-VE')} /{' '}
                  {Number(product.minimumStock).toLocaleString('es-VE')} {product.saleUnit}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
