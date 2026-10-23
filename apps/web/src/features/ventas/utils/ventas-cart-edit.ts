import { materialSaleUnitPriceUsd } from '@/features/ventas/utils/material-sale-price'
import {
  getBaseFormulaMaterialIds,
  hasAddedMaterialsBeyondBase,
  resolveCartLineUnitPriceUsd,
  type SaleLineFormulaMaterial,
  type SaleLineFormulaMaterialRef,
} from '@/features/ventas/utils/sale-line-formula'
import type { CartLine } from '@/features/ventas/utils/ventas-cart-lines'
import { normalizeInventoryQuantity } from '@/lib/inventory-units'

export type ServiceLineValues = {
  quantity: number
  unitPriceUsd: number
  detail: string | null
}

export function removeCartLine(lines: CartLine[], lineId: string): CartLine[] {
  return lines.filter((item) => item.id !== lineId)
}

/** Zero or less removes the line; otherwise the quantity is rounded to the line unit. */
export function setCartLineQuantity(
  lines: CartLine[],
  lineId: string,
  quantity: number
): CartLine[] {
  const line = lines.find((item) => item.id === lineId)
  if (!line) return lines

  if (quantity <= 0) {
    return removeCartLine(lines, lineId)
  }

  const unit = line.kind === 'material' ? line.material.unit : (line.product.sale_unit ?? 'UND')
  const normalized = normalizeInventoryQuantity(quantity, unit)

  return lines.map((item) => (item.id === lineId ? { ...item, quantity: normalized } : item))
}

/** Wholesale uses the pack sale price when it is set; otherwise falls back to retail. */
export function toggleCartLineWholesale(
  lines: CartLine[],
  lineId: string,
  checked: boolean
): CartLine[] {
  return lines.map((line) => {
    if (line.id !== lineId) return line
    if (line.kind === 'material') {
      const packSale = Number(line.material.wholesaleSalePriceUsd)
      const retail = materialSaleUnitPriceUsd(line.material)
      return {
        ...line,
        isWholesale: checked,
        unitPriceUsd: checked && Number.isFinite(packSale) && packSale > 0 ? packSale : retail,
      }
    }
    const packSale = Number(line.product.wholesale_sale_price_usd)
    const retail = Number(line.product.sale_price_usd)
    return {
      ...line,
      isWholesale: checked,
      unitPriceUsd: checked && Number.isFinite(packSale) && packSale > 0 ? packSale : retail,
    }
  })
}

export function setCartLineUnitPrice(
  lines: CartLine[],
  lineId: string,
  unitPriceUsd: number
): CartLine[] {
  return lines.map((line) =>
    line.id === lineId ? { ...line, unitPriceUsd: Math.max(0, unitPriceUsd) } : line
  )
}

export function setCartLineKitchenNote(
  lines: CartLine[],
  lineId: string,
  note: string | null
): CartLine[] {
  return lines.map((line) =>
    line.id === lineId && line.kind === 'catalog'
      ? { ...line, kitchenNote: note?.trim() ? note.trim() : null }
      : line
  )
}

export function updateServiceCartLine(
  lines: CartLine[],
  lineId: string,
  values: ServiceLineValues
): CartLine[] {
  return lines.map((line) =>
    line.id === lineId && line.kind === 'catalog'
      ? {
          ...line,
          quantity: values.quantity,
          unitPriceUsd: values.unitPriceUsd,
          detail: values.detail,
        }
      : line
  )
}

/**
 * `null` restores the base recipe. Adding materials beyond the base recipe reprices the line;
 * only changing quantities of base materials keeps the current price. Catalog list products
 * do not include their formula, so callers pass the base material ids they loaded.
 * The line keeps the material refs so the recipe can be shown again with names and units.
 */
export function setCartLineFormulaMaterials(
  lines: CartLine[],
  lineId: string,
  materials: SaleLineFormulaMaterial[] | null,
  materialRefs: SaleLineFormulaMaterialRef[] = [],
  baseMaterialIds?: number[]
): CartLine[] {
  return lines.map((line) => {
    if (line.id !== lineId || line.kind !== 'catalog') {
      return line
    }

    if (materials === null) {
      return {
        ...line,
        formulaMaterials: null,
      }
    }

    const baseIds = baseMaterialIds
      ? new Set(baseMaterialIds)
      : getBaseFormulaMaterialIds(line.product)
    const hasAdded = hasAddedMaterialsBeyondBase(baseIds, materials)

    return {
      ...line,
      formulaMaterials: materials.map(
        (item) => materialRefs.find((ref) => ref.material_id === item.material_id) ?? item
      ),
      unitPriceUsd: hasAdded
        ? resolveCartLineUnitPriceUsd(line.product, materials, materialRefs, baseIds)
        : line.unitPriceUsd,
    }
  })
}
