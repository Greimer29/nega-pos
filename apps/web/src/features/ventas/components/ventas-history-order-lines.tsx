import { Loader2 } from 'lucide-react'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { useSaleQuery } from '@/features/ventas/hooks/use-sales'
import { catalogProductCode } from '@/features/ventas/components/ventas-order-cart'
import { invoiceDiscountLabel } from '@/features/ventas/utils/invoice-discount'
import { QueryErrorState } from '@/features/notifications/query-error-state'
import {
  formatWholesaleQuantityShort,
  saleLinePriceUnitLabel,
} from '@/lib/wholesale'

type VentasHistoryOrderLinesProps = {
  saleId: number
}

function activeQuantity(quantity: string, returned: string | undefined) {
  return Math.max(0, Number(quantity) - Number(returned ?? 0))
}

export function VentasHistoryOrderLines({ saleId }: VentasHistoryOrderLinesProps) {
  const { data: sale, isLoading, isError, error } = useSaleQuery(saleId)
  const lines = sale?.lines ?? []
  const linesSubtotal = lines.reduce((sum, line) => {
    const netQty = activeQuantity(line.quantity, line.returned_quantity)
    return sum + netQty * Number(line.unit_price_usd)
  }, 0)
  const discountUsd = Number(sale?.discount_usd ?? 0)
  const discountLabel = sale ? invoiceDiscountLabel(sale.total_usd, sale.discount_usd) : null

  return (
    <tr className="bg-muted/20 border-b last:border-b-0">
      <td colSpan={7} className="px-4 py-3">
        {isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Cargando productos…
          </div>
        ) : isError ? (
          <QueryErrorState
            isError
            error={error}
            title="No se pudieron cargar los productos"
            className="py-2"
          />
        ) : lines.length === 0 ? (
          <p className="text-muted-foreground py-2 text-sm">Esta factura no tiene líneas.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border bg-white">
            <table className="w-full min-w-[560px] text-sm">
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
                  const isWholesale = Boolean(line.is_wholesale)
                  const quantityLabel = isWholesale
                    ? formatWholesaleQuantityShort(netQty, line.units_per_pack)
                    : String(netQty)
                  const priceUnit = saleLinePriceUnitLabel(isWholesale)

                  return (
                    <tr key={line.id} className="border-b last:border-b-0">
                      <td className="text-muted-foreground px-3 py-2 font-mono text-xs">
                        {line.catalog_product_id
                          ? catalogProductCode(line.catalog_product_id)
                          : '—'}
                      </td>
                      <td className="px-3 py-2">
                        {line.catalog_product?.name ?? line.description}
                        {isWholesale ? (
                          <span className="text-muted-foreground ml-2 text-[11px]">MAY</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{quantityLabel}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        <DisplayMoneyFromUsd amountUsd={line.unit_price_usd} size="sm" />
                        <span className="text-muted-foreground ml-1 text-[11px]">{priceUnit}</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <DisplayMoneyFromUsd amountUsd={netSubtotalUsd} size="sm" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/20">
                  <td colSpan={4} className="text-muted-foreground px-3 py-2 text-right">
                    Subtotal
                  </td>
                  <td className="px-3 py-2 text-right">
                    <DisplayMoneyFromUsd amountUsd={linesSubtotal} size="sm" />
                  </td>
                </tr>
                {discountUsd > 0.0001 ? (
                  <tr className="bg-muted/20">
                    <td colSpan={4} className="px-3 py-2 text-right font-medium text-violet-700">
                      {discountLabel ?? 'Descuento'}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-violet-700">
                      −<DisplayMoneyFromUsd amountUsd={discountUsd} size="sm" />
                    </td>
                  </tr>
                ) : null}
                <tr className="bg-muted/30 font-semibold">
                  <td colSpan={4} className="px-3 py-2 text-right">
                    Total
                  </td>
                  <td className="px-3 py-2 text-right">
                    <DisplayMoneyFromUsd amountUsd={sale?.total_usd ?? 0} size="sm" />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </td>
    </tr>
  )
}
