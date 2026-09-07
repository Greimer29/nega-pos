import type { Material } from '@/features/materials/types'

/** Precio unitario de venta del material (salePriceUsd o, si falta, costo de última compra). */
export function materialSaleUnitPriceUsd(material: Material): number {
  const sale = material.salePriceUsd != null ? Number(material.salePriceUsd) : NaN
  if (Number.isFinite(sale) && sale > 0) {
    return sale
  }
  const cost = material.lastPurchasePriceUsd != null ? Number(material.lastPurchasePriceUsd) : 0
  return Number.isFinite(cost) && cost > 0 ? cost : 0
}
