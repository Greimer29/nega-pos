import { buildDailyVentasBuckets, buildWeeklyVentasBuckets } from '#utils/dashboard_chart_periods'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

test.group('dashboard_chart_periods', () => {
  test('daily buckets use ISO week matching the current weekly bucket', ({ assert }) => {
    const anchor = DateTime.fromISO('2026-06-18')
    const daily = buildDailyVentasBuckets(anchor)
    const weekly = buildWeeklyVentasBuckets(anchor)
    const currentWeek = weekly[weekly.length - 1]!

    assert.lengthOf(daily, 7)
    assert.equal(daily[0]!.desde, '2026-06-15')
    assert.equal(daily[6]!.hasta, '2026-06-21')
    assert.equal(daily[0]!.desde, currentWeek.desde)
    assert.equal(daily[6]!.hasta, currentWeek.hasta)
  })

  test('daily buckets no longer start on Sunday when anchor is mid-week', ({ assert }) => {
    const anchor = DateTime.fromISO('2026-06-18')
    const daily = buildDailyVentasBuckets(anchor)

    assert.notEqual(daily[0]!.desde, '2026-06-14')
    assert.equal(DateTime.fromISO(daily[0]!.desde).weekday, 1)
  })
})
