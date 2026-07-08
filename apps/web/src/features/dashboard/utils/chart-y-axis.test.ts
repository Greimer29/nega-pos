import { describe, expect, it } from 'vitest'

import { buildUsdStepAxis } from './chart-y-axis'

describe('buildUsdStepAxis', () => {
  it('uses minimum scale of 100 USD', () => {
    expect(buildUsdStepAxis(0)).toEqual({ yMaxUsd: 100, ticksUsd: [0, 100] })
  })

  it('rounds up to the next 100 USD step', () => {
    expect(buildUsdStepAxis(150)).toEqual({ yMaxUsd: 200, ticksUsd: [0, 100, 200] })
  })

  it('keeps exact multiples of 100', () => {
    expect(buildUsdStepAxis(300)).toEqual({ yMaxUsd: 300, ticksUsd: [0, 100, 200, 300] })
  })
})
