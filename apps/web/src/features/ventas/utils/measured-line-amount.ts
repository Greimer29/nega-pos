import {
  inventoryQuantityMinPositive,
  isMeasuredSaleUnit,
  normalizeInventoryQuantity,
} from '@/lib/inventory-units'

/**
 * Convierte un importe de línea (USD) en cantidad facturable para KG/MTS.
 * qty = importe ÷ precio unitario, redondeada a la precisión de la unidad.
 * Si el precio es 0 o inválido → null (no se puede recalcular).
 */
export function quantityFromLineAmountUsd(
  amountUsd: number,
  unitPriceUsd: number,
  unit: string
): number | null {
  if (!isMeasuredSaleUnit(unit)) {
    return null
  }
  if (!Number.isFinite(amountUsd) || amountUsd < 0) {
    return null
  }
  if (!Number.isFinite(unitPriceUsd) || unitPriceUsd <= 0) {
    return null
  }

  const raw = amountUsd / unitPriceUsd
  const normalized = normalizeInventoryQuantity(raw, unit)
  if (normalized > 0) {
    return normalized
  }
  if (amountUsd > 0) {
    return inventoryQuantityMinPositive(unit)
  }
  return 0
}

/** Importe de línea en USD a 4 decimales (mismo criterio que precios del POS). */
export function lineAmountUsdFromQuantity(quantity: number, unitPriceUsd: number): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPriceUsd)) {
    return 0
  }
  return Math.round(Math.max(0, quantity) * Math.max(0, unitPriceUsd) * 10_000) / 10_000
}
