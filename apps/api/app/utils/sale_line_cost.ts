type WholesaleLineCostInput = {
  isWholesale: boolean
  unitsPerPack: number | string | null
  unitCostUsd: string | null
  wholesaleCostUsd: string | null
}

export function resolveProductSaleLineCost(input: WholesaleLineCostInput): string | null {
  if (!input.isWholesale) {
    return input.unitCostUsd
  }

  const packUnits = input.unitsPerPack ? Number(input.unitsPerPack) : 0
  return (
    input.wholesaleCostUsd ??
    (packUnits > 0 ? (Number(input.unitCostUsd) * packUnits).toFixed(4) : input.unitCostUsd)
  )
}

export function resolveMaterialSaleLineCost(input: WholesaleLineCostInput): string | null {
  if (!input.isWholesale) {
    return input.unitCostUsd
  }

  const packUnits = input.unitsPerPack ? Number(input.unitsPerPack) : 0
  return (
    input.wholesaleCostUsd ??
    (packUnits > 0 && input.unitCostUsd
      ? (Number(input.unitCostUsd) * packUnits).toFixed(4)
      : input.unitCostUsd)
  )
}

export function freezeFormulaSaleLineCost(
  unitCostUsd: number,
  isWholesale: boolean,
  unitsPerPack: number | string | null
): string {
  const packUnits = isWholesale && unitsPerPack ? Number(unitsPerPack) : 1
  return (unitCostUsd * packUnits).toFixed(4)
}
