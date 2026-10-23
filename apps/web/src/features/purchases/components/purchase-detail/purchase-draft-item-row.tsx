import { Pencil, Trash2 } from 'lucide-react'
import { DecimalInput, MoneyInput } from '@/components/decimal-input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useFormatMoney } from '@/features/currencies/context/display-currency-context'
import type { LocalPurchaseItem } from '@/features/purchases/types'
import { isValidPurchaseRate } from '@/features/purchases/utils/purchase-entry-currency'
import {
  localItemCanWholesale,
  localItemCode,
  localItemName,
  localItemUnit,
  localItemUnitCode,
} from '@/features/purchases/utils/purchase-local-items'
import { inventoryQuantityDecimals, normalizeInventoryQuantity } from '@/lib/inventory-units'
import { parseDecimalInput } from '@/lib/numeric-input'

type PurchaseDraftItemRowProps = {
  item: LocalPurchaseItem
  entryInNative: boolean
  entryPriceDecimals: number
  canEnterPriceInNative: boolean
  rateNum: number | null
  displayEntryCurrency: string
  /** Native unit price shown in the input (keeps what the user typed). */
  nativeUnitPrice: number
  onQuantityChange: (quantity: number) => void
  onToggleWholesale: (checked: boolean) => void
  onPriceUsdChange: (unitPriceUsd: number) => void
  onPriceNativeChange: (native: number, rate: number) => void
  onEditMaterial: () => void
  onEditProduct: () => void
  onRemove: () => void
}

export function PurchaseDraftItemRow({
  item,
  entryInNative,
  entryPriceDecimals,
  canEnterPriceInNative,
  rateNum,
  displayEntryCurrency,
  nativeUnitPrice,
  onQuantityChange,
  onToggleWholesale,
  onPriceUsdChange,
  onPriceNativeChange,
  onEditMaterial,
  onEditProduct,
  onRemove,
}: PurchaseDraftItemRowProps) {
  const { formatFromUsd, formatNative } = useFormatMoney()
  const unit = localItemUnitCode(item)
  const quantityDecimals = inventoryQuantityDecimals(unit)

  return (
    <tr className="border-b last:border-b-0">
      <td className="px-3 py-2">{localItemCode(item)}</td>
      <td className="px-3 py-2">{localItemName(item)}</td>
      <td className="px-3 py-2">
        {localItemCanWholesale(item) ? (
          <label className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={Boolean(item.isWholesale)}
              onChange={(e) => onToggleWholesale(e.target.checked)}
            />
            Paq.
          </label>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        {item.itemType === 'machine' ? (
          <span className="tabular-nums">{item.quantity}</span>
        ) : (
          <DecimalInput
            min="0"
            decimals={quantityDecimals}
            className="h-8 w-24"
            value={item.quantity}
            onChange={(e) =>
              onQuantityChange(
                normalizeInventoryQuantity(
                  parseDecimalInput(e.target.value, quantityDecimals) ?? 0,
                  unit
                )
              )
            }
          />
        )}
      </td>
      <td className="px-3 py-2">{localItemUnit(item)}</td>
      <td className="px-3 py-2">
        {entryInNative ? (
          <MoneyInput
            min="0"
            decimals={entryPriceDecimals}
            className="h-8 w-28"
            disabled={!canEnterPriceInNative}
            value={nativeUnitPrice}
            onChange={(e) => {
              const native = parseDecimalInput(e.target.value, entryPriceDecimals) ?? 0
              if (isValidPurchaseRate(rateNum)) {
                onPriceNativeChange(native, rateNum)
              }
            }}
          />
        ) : (
          <MoneyInput
            min="0"
            decimals={entryPriceDecimals}
            className="h-8 w-28"
            value={item.unitPriceUsd}
            onChange={(e) =>
              onPriceUsdChange(parseDecimalInput(e.target.value, entryPriceDecimals) ?? 0)
            }
          />
        )}
      </td>
      <td className="px-3 py-2 tabular-nums">
        {entryInNative && isValidPurchaseRate(rateNum)
          ? formatNative(item.quantity * nativeUnitPrice, displayEntryCurrency)
          : formatFromUsd(item.quantity * item.unitPriceUsd)}
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          {item.itemType === 'material' ? (
            <Button
              variant="ghost"
              size="sm"
              title="Editar material"
              aria-label="Editar material"
              onClick={onEditMaterial}
            >
              <Pencil />
            </Button>
          ) : null}
          {item.itemType === 'product' ? (
            <Button
              variant="ghost"
              size="sm"
              title="Editar producto"
              aria-label="Editar producto"
              onClick={onEditProduct}
            >
              <Pencil />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            title="Eliminar ítem"
            aria-label="Eliminar ítem"
            className="text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        </div>
      </td>
    </tr>
  )
}
