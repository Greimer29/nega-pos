import { describe, expect, it } from 'vitest'

import { buildUsdStepAxis } from './chart-y-axis'

describe('buildUsdStepAxis', () => {
  it('uses a small default scale when there is no data', () => {
    expect(buildUsdStepAxis(0)).toEqual({ yMaxUsd: 1, ticksUsd: [0, 1] })
  })

  it('auto-scales to a nice ceiling above the data peak', () => {
    expect(buildUsdStepAxis(14.24)).toEqual({
      yMaxUsd: 15,
      ticksUsd: [0, 5, 10, 15],
    })
  })

  it('auto-scales larger peaks without a fixed 100 step', () => {
    expect(buildUsdStepAxis(150)).toEqual({
      yMaxUsd: 150,
      ticksUsd: [0, 50, 100, 150],
    })
  })
})
