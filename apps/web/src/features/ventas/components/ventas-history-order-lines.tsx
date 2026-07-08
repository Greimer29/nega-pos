import { Loader2 } from 'lucide-react'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { useSaleQuery } from '@/features/ventas/hooks/use-sales'
import { catalogProductCode } from '@/features/ventas/components/ventas-order-cart'
import { getApiErrorMessage } from '@/lib/api-error'

type VentasHistoryOrderLinesProps = {
  saleId: number
}

function activeQuantity(quantity: string, returned: string | undefined) {
  return Math.max(0, Number(quantity) - Number(returned ?? 0))
}

export function VentasHistoryOrderLines({ saleId }: VentasHistoryOrderLinesProps) {
  const { data: sale, isLoading, isError, error } = useSaleQuery(saleId)
  const lines = sale?.lines ?? []

  return (
    <tr className="bg-muted/20 border-b last:border-b-0">
      <td colSpan={7} className="px-4 py-3">
        {isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Cargando productos…
          </div>
        ) : isError ? (
          <p className="text-destructive py-2 text-sm whitespace-pre-line">{getApiErrorMessage(error)}</p>
        ) : lines.length === 0 ? (
          <p className="text-muted-foreground py-2 text-sm">Esta factura no tiene líneas.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border bg-white">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-muted/40">
                <tr className="border-b text-left">
                  <th className="px-3 py-2 font-medium">Código</th>
                  <th className="px-3 py-2 font-medium">Producto</th>
                  <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                  <th className="px-3 py-2 text-right font-medium">Precio</th>
                  <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const netQty = activeQuantity(line.quantity, line.returned_quantity)
                  const netSubtotalUsd = netQty * Number(line.unit_price_usd)

                  return (
                    <tr key={line.id} className="border-b last:border-b-0">
                      <td className="text-muted-foreground px-3 py-2 font-mono text-xs">
                        {line.catalog_product_id
                          ? catalogProductCode(line.catalog_product_id)
                          : '—'}
                      </td>
                      <td className="px-3 py-2">
                        {line.catalog_product?.name ?? line.description}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{netQty}</td>
                      <td className="px-3 py-2 text-right">
                        <DisplayMoneyFromUsd amountUsd={line.unit_price_usd} size="sm" />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <DisplayMoneyFromUsd amountUsd={netSubtotalUsd} size="sm" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </td>
    </tr>
  )
}
