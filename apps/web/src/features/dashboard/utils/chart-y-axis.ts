export function buildUsdStepAxis(maxUsd: number, stepUsd = 100): {
  yMaxUsd: number
  ticksUsd: number[]
} {
  const safeMax = Number.isFinite(maxUsd) && maxUsd > 0 ? maxUsd : 0
  const yMaxUsd = Math.max(stepUsd, Math.ceil(safeMax / stepUsd) * stepUsd)

  const ticksUsd: number[] = []
  for (let tick = 0; tick <= yMaxUsd; tick += stepUsd) {
    ticksUsd.push(tick)
  }

  return { yMaxUsd, ticksUsd }
}
