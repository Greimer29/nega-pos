import { materialImageUrl, UNIT_ABREV } from '@/features/materials/constants'
import {
  catalogImageTone,
  catalogProductCode,
  type VentasCartLine,
} from '@/features/ventas/components/ventas-order-cart'
import { catalogImageUrl } from '@/features/ventas/constants'
import { materialSaleUnitPriceUsd } from '@/features/ventas/utils/material-sale-price'
import { cartLineUnitPrice, type CartLine } from '@/features/ventas/utils/ventas-cart-lines'
import { wholesaleUnitsPerPack } from '@/lib/wholesale'

export type VentasCartLineHandlers = {
  onToggleWholesale: (lineId: string, checked: boolean) => void
  onAdjustFormula: (lineId: string) => void
  onEditKitchenNote: (lineId: string) => void
  onEditDetail: (lineId: string) => void
}

/**
 * Rows shown in the POS cart. Services edit their detail instead of a kitchen note; only
 * products with a formula can adjust materials; wholesale only when the item allows it.
 */
export function buildVentasCartLines(
  cart: CartLine[],
  handlers: VentasCartLineHandlers
): VentasCartLine[] {
  return cart.map((line) => {
    if (line.kind === 'material') {
      return {
        key: line.id,
        name: line.material.name,
        code: line.material.code,
        quantity: line.quantity,
        unitPriceUsd: cartLineUnitPrice(line),
        listPriceUsd: materialSaleUnitPriceUsd(line.material),
        saleUnit: line.material.unit,
        imageUrl: line.material.imagePath ? materialImageUrl(line.material.id) : null,
        imageTone: catalogImageTone(line.material.id),
        metaLabel: UNIT_ABREV[line.material.unit] ?? line.material.unit,
        canWholesale: Boolean(line.material.wholesaleEnabled),
        isWholesale: Boolean(line.isWholesale),
        wholesaleHint: line.isWholesale
          ? `× ${wholesaleUnitsPerPack(line.material) ?? 0} und`
          : null,
        onToggleWholesale: line.material.wholesaleEnabled
          ? (checked: boolean) => handlers.onToggleWholesale(line.id, checked)
          : undefined,
      }
    }

    const productPackUnits = wholesaleUnitsPerPack(line.product)
    const isService = line.product.item_kind === 'SERVICE' || Boolean(line.product.is_service)

    return {
      key: line.id,
      name: line.product.name,
      code: catalogProductCode(line.product.id),
      quantity: line.quantity,
      unitPriceUsd: cartLineUnitPrice(line),
      listPriceUsd: line.isWholesale
        ? Number(line.product.wholesale_sale_price_usd ?? line.product.sale_price_usd)
        : Number(line.product.sale_price_usd),
      saleUnit: line.product.sale_unit ?? 'UND',
      imageUrl: line.product.image_path ? catalogImageUrl(line.product.id) : null,
      imageTone: catalogImageTone(line.product.id),
      metaLabel: line.size ? `Talla ${line.size}` : isService ? 'Servicio' : undefined,
      detail: line.detail ?? null,
      isService,
      hasFormula: Boolean(line.product.formula_id),
      hasCustomFormula: line.formulaMaterials != null && line.formulaMaterials.length > 0,
      kitchenNote: line.kitchenNote ?? null,
      onAdjustFormula: line.product.formula_id
        ? () => handlers.onAdjustFormula(line.id)
        : undefined,
      onEditKitchenNote: isService ? undefined : () => handlers.onEditKitchenNote(line.id),
      onEditDetail: isService ? () => handlers.onEditDetail(line.id) : undefined,
      canWholesale: Boolean(line.product.wholesale_enabled),
      isWholesale: Boolean(line.isWholesale),
      wholesaleHint:
        line.isWholesale && productPackUnits != null ? `× ${productPackUnits} und` : null,
      onToggleWholesale: line.product.wholesale_enabled
        ? (checked: boolean) => handlers.onToggleWholesale(line.id, checked)
        : undefined,
    }
  })
}
