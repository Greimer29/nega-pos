import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { formatFecha, MODALIDAD_LABELS } from '@/features/orders/constants'
import type { Order } from '@/features/orders/types'

type OrderSummaryDetailsProps = {
  order: Order
  netTotalUsd: number
  hasReturnedLines: boolean
}

export function OrderSummaryDetails({
  order,
  netTotalUsd,
  hasReturnedLines,
}: OrderSummaryDetailsProps) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-muted-foreground">Modalidad</dt>
        <dd>{MODALIDAD_LABELS[order.modalidad]}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Cantidad total</dt>
        <dd>{order.totalQuantity}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-muted-foreground">Descripción</dt>
        <dd>{order.description}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Fecha de pedido</dt>
        <dd>{formatFecha(order.dateOrder)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Entrega estimada</dt>
        <dd>{formatFecha(order.estimatedDeliveryDate)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Precio total (USD $)</dt>
        <dd>
          <DisplayMoneyFromUsd amountUsd={netTotalUsd} />
          {hasReturnedLines ? (
            <p className="text-muted-foreground mt-1 text-xs">
              Neto tras devoluciones (sin productos devueltos).
            </p>
          ) : null}
        </dd>
      </div>
      {order.notes ? (
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Notas</dt>
          <dd>{order.notes}</dd>
        </div>
      ) : null}
    </dl>
  )
}
