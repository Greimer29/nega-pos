/** Margen sobre costo: ((venta - costo) / costo) × 100 — mismo criterio que aplicar margen de ganancia. */
export function calcProfitMarginPercent(
  salePriceUsd: string | number,
  costUsd: string | number
): number | null {
  const sale = Number(salePriceUsd)
  const cost = Number(costUsd)

  if (!Number.isFinite(sale) || !Number.isFinite(cost) || cost <= 0) {
    return null
  }

  return ((sale - cost) / cost) * 100
}

export function formatProfitMarginPercent(percent: number | null): string {
  if (percent === null) {
    return '—'
  }

  return `${percent.toLocaleString('es-VE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
}

/** Porcentaje con signo explícito (+ / −) para tarjetas compactas. */
export function formatSignedProfitMarginPercent(percent: number | null): string {
  if (percent === null) {
    return '—'
  }

  const abs = Math.abs(percent).toLocaleString('es-VE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

  if (percent > 0) {
    return `+${abs}%`
  }
  if (percent < 0) {
    return `-${abs}%`
  }

  return `${abs}%`
}

export function profitMarginIsNegative(percent: number | null): boolean {
  return percent !== null && percent < 0
}

export function calcSalePriceFromMargin(
  costUsd: string | number,
  marginPercent: number
): number | null {
  const cost = Number(costUsd)
  if (!Number.isFinite(cost) || cost <= 0 || !Number.isFinite(marginPercent) || marginPercent < 0) {
    return null
  }

  return cost * (1 + marginPercent / 100)
}
