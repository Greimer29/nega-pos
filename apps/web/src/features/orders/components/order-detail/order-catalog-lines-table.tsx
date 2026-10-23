import type { OrderLine } from '@/features/orders/types'
import {
  orderLineActiveQuantity,
  orderLineNetSubtotalUsd,
} from '@/features/orders/utils/order-line-totals'
import { cn } from '@/lib/utils'

type OrderCatalogLinesTableProps = {
  lines: OrderLine[]
  formatFromUsd: (amountUsd: number) => string
}

export function OrderCatalogLinesTable({ lines, formatFromUsd }: OrderCatalogLinesTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-2">Producto</th>
            <th className="pb-2 text-right">Cantidad</th>
            <th className="pb-2 text-right">P. unit. USD</th>
            <th className="pb-2 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const returned = Number(line.returned_quantity ?? 0)
            const activeQty = orderLineActiveQuantity(line)
            const fullyReturned = activeQty <= 0
            const netSubtotalUsd = orderLineNetSubtotalUsd(line)

            return (
              <tr
                key={line.id}
                className={cn('border-b', fullyReturned && 'bg-muted/30 text-muted-foreground')}
              >
                <td className="py-2">
                  <span className={cn(fullyReturned && 'line-through')}>
                    {line.catalog_product?.name ?? `Producto #${line.catalog_product_id}`}
                  </span>
                  {returned > 0 ? (
                    <span className="text-destructive ml-2 text-xs font-medium">
                      {fullyReturned ? 'Devuelto' : `Devuelto: ${returned}`}
                    </span>
                  ) : null}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {returned > 0 && !fullyReturned ? (
                    <span>
                      {activeQty.toLocaleString('es-VE')}{' '}
                      <span className="text-muted-foreground text-xs">
                        de {Number(line.quantity).toLocaleString('es-VE')}
                      </span>
                    </span>
                  ) : (
                    line.quantity
                  )}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatFromUsd(Number(line.unit_price_usd))}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {fullyReturned ? (
                    <span className="line-through">{formatFromUsd(Number(line.subtotal_usd))}</span>
                  ) : returned > 0 ? (
                    <span>
                      {formatFromUsd(netSubtotalUsd)}
                      <span className="text-muted-foreground ml-1 text-xs line-through">
                        {formatFromUsd(Number(line.subtotal_usd))}
                      </span>
                    </span>
                  ) : (
                    formatFromUsd(netSubtotalUsd)
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
