import type { Material } from '@/features/materials/types'
import type { CatalogProduct } from '@/features/ventas/types'
import type { VentasCartDraftLine } from '@/features/ventas/utils/ventas-cart-draft'
import { materialSaleUnitPriceUsd } from '@/features/ventas/utils/material-sale-price'
import {
  createCartLineId,
  type SaleLineFormulaMaterial,
} from '@/features/ventas/utils/sale-line-formula'

export type CartLine =
  | {
      id: string
      kind: 'catalog'
      product: CatalogProduct
      quantity: number
      formulaMaterials?: SaleLineFormulaMaterial[] | null
      unitPriceUsd?: number
      kitchenNote?: string | null
      detail?: string | null
      catalogProductSizeId?: number | null
      size?: string | null
      isWholesale?: boolean
    }
  | {
      id: string
      kind: 'material'
      material: Material
      quantity: number
      unitPriceUsd?: number
      isWholesale?: boolean
    }

export function cartLineUnitPrice(line: CartLine): number {
  if (line.unitPriceUsd != null) {
    return line.unitPriceUsd
  }
  if (line.isWholesale) {
    if (line.kind === 'material') {
      const pack = Number(line.material.wholesaleSalePriceUsd)
      if (Number.isFinite(pack) && pack > 0) return pack
      return materialSaleUnitPriceUsd(line.material)
    }
    const pack = Number(line.product.wholesale_sale_price_usd)
    if (Number.isFinite(pack) && pack > 0) return pack
  }
  if (line.kind === 'material') {
    return materialSaleUnitPriceUsd(line.material)
  }
  return Number(line.product.sale_price_usd)
}

export function normalizeDraftCartLine(line: VentasCartDraftLine): CartLine | null {
  if (line.kind === 'material' && line.material) {
    return {
      id: line.id ?? createCartLineId(),
      kind: 'material',
      material: line.material,
      quantity: line.quantity,
      unitPriceUsd: line.unitPriceUsd,
      isWholesale: line.isWholesale,
    }
  }
  if (line.product) {
    return {
      id: line.id ?? createCartLineId(),
      kind: 'catalog',
      product: line.product,
      quantity: line.quantity,
      formulaMaterials: line.formulaMaterials ?? null,
      unitPriceUsd: line.unitPriceUsd,
      kitchenNote: line.kitchenNote ?? null,
      detail: line.detail ?? null,
      catalogProductSizeId: line.catalogProductSizeId ?? null,
      size: line.size ?? null,
      isWholesale: line.isWholesale,
    }
  }
  return null
}
