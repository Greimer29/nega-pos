/** Nice-number helpers for chart Y axes (Wilkinson-style 1/2/5×10^n). */

function niceNum(range: number, round: boolean): number {
  if (!Number.isFinite(range) || range <= 0) {
    return 1
  }

  const exponent = Math.floor(Math.log10(range))
  const fraction = range / 10 ** exponent
  let niceFraction: number

  if (round) {
    if (fraction < 1.5) niceFraction = 1
    else if (fraction < 3) niceFraction = 2
    else if (fraction < 7) niceFraction = 5
    else niceFraction = 10
  } else if (fraction <= 1) {
    niceFraction = 1
  } else if (fraction <= 2) {
    niceFraction = 2
  } else if (fraction <= 5) {
    niceFraction = 5
  } else {
    niceFraction = 10
  }

  return niceFraction * 10 ** exponent
}

function snapTicks(yMaxUsd: number, stepUsd: number): number[] {
  const ticksUsd: number[] = []
  const guard = yMaxUsd + stepUsd * 1e-9
  for (let tick = 0; tick <= guard; tick += stepUsd) {
    ticksUsd.push(Number(tick.toPrecision(12)))
  }
  return ticksUsd
}

export type BuildUsdStepAxisOptions = {
  /** Approximate number of intervals (default 4 → ~5 tick marks including 0). */
  preferredTickCount?: number
}

/**
 * Builds a Y-axis ceiling and tick marks from a data peak (base-currency units).
 * Picks a “nice” scale automatically from the series maximum.
 */
export function buildUsdStepAxis(
  maxUsd: number,
  options: BuildUsdStepAxisOptions = {}
): {
  yMaxUsd: number
  ticksUsd: number[]
} {
  const preferredTickCount = Math.max(2, options.preferredTickCount ?? 4)

  const safeMax = Number.isFinite(maxUsd) && maxUsd > 0 ? maxUsd : 0
  if (safeMax === 0) {
    return { yMaxUsd: 1, ticksUsd: [0, 1] }
  }

  const roughStep = safeMax / preferredTickCount
  const stepUsd = niceNum(roughStep, true)
  const yMaxUsd = Math.ceil(safeMax / stepUsd) * stepUsd

  return { yMaxUsd, ticksUsd: snapTicks(yMaxUsd, stepUsd) }
}
