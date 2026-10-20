import { formatMachineTypeLabel } from '@/features/machines/constants'
import { UNIT_ABREV } from '@/features/materials/constants'
import { PrecioEnMonedaIngreso } from '@/features/purchases/components/purchase-entry-price'
import type { PurchaseItem } from '@/features/purchases/types'
import { catalogProductCode } from '@/features/ventas/components/ventas-order-cart'
import { productSaleUnitAbrev } from '@/features/ventas/constants'

type PurchaseConfirmedItemRowProps = {
  item: PurchaseItem
  displayEntryCurrency: string
  baseCurrencyCode: string
  rateNum: number | null
}

/** Read-only row of a confirmed or voided purchase, priced in its entry currency. */
export function PurchaseConfirmedItemRow({
  item,
  displayEntryCurrency,
  baseCurrencyCode,
  rateNum,
}: PurchaseConfirmedItemRowProps) {
  return (
    <tr className="border-b last:border-b-0">
      <td className="px-3 py-2">
        {item.itemType === 'machine'
          ? formatMachineTypeLabel(item.machine?.type ?? 'OTHER')
          : item.itemType === 'product'
            ? catalogProductCode(item.catalogProduct?.id ?? item.catalogProductId ?? 0)
            : (item.material?.code ?? '—')}
      </td>
      <td className="px-3 py-2">
        {item.itemType === 'machine'
          ? (item.machine?.name ?? '—')
          : item.itemType === 'product'
            ? (item.catalogProduct?.name ?? '—')
            : (item.material?.name ?? '—')}
      </td>
      <td className="px-3 py-2">{item.isWholesale ? 'Paq.' : '—'}</td>
      <td className="px-3 py-2 tabular-nums">{item.quantity}</td>
      <td className="px-3 py-2">
        {item.itemType === 'machine'
          ? 'Und'
          : item.isWholesale
            ? 'Paq.'
            : item.itemType === 'product'
              ? productSaleUnitAbrev(item.catalogProduct?.saleUnit ?? 'UND')
              : item.material
                ? UNIT_ABREV[item.material.unit]
                : '—'}
      </td>
      <td className="px-3 py-2">
        <PrecioEnMonedaIngreso
          precioUsd={item.unitPriceUsd}
          precioNativo={item.unitPriceBs}
          entryCurrency={displayEntryCurrency}
          baseCurrencyCode={baseCurrencyCode}
          rate={rateNum}
          size="sm"
        />
      </td>
      <td className="px-3 py-2">
        <PrecioEnMonedaIngreso
          precioUsd={item.subtotalUsd}
          precioNativo={item.subtotalBs}
          entryCurrency={displayEntryCurrency}
          baseCurrencyCode={baseCurrencyCode}
          rate={rateNum}
          size="sm"
        />
      </td>
    </tr>
  )
}
