import {
  APP_TIMEZONE,
  datetimeRangeUtcSql,
  dayEndInAppZone,
  dayStartInAppZone,
  dayStartUtcSql,
  sqlDateToIsoDate,
  toAppIsoDate,
} from '#utils/app_timezone'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

test.group('app_timezone', () => {
  test('shop day starts at midnight Caracas (= 04:00 UTC)', ({ assert }) => {
    const start = dayStartInAppZone('2026-10-14')
    assert.equal(start.zoneName, APP_TIMEZONE)
    assert.equal(start.toISO(), '2026-10-14T00:00:00.000-04:00')
    assert.equal(dayStartUtcSql('2026-10-14'), '2026-10-14 04:00:00')
  })

  test('shop day end is last instant of Caracas day', ({ assert }) => {
    const end = dayEndInAppZone('2026-10-14')
    assert.equal(end.toISO(), '2026-10-14T23:59:59.999-04:00')
  })

  test('datetimeRangeUtcSql covers full Caracas day as half-open UTC interval', ({ assert }) => {
    const { fromSql, toExclusiveSql } = datetimeRangeUtcSql('2026-10-14', '2026-10-14')
    assert.equal(fromSql, '2026-10-14 04:00:00')
    assert.equal(toExclusiveSql, '2026-10-15 04:00:00')
  })

  test('evening Caracas sale maps to same app calendar day', ({ assert }) => {
    const soldAt = DateTime.fromISO('2026-10-14T21:00:00', { zone: APP_TIMEZONE })
    assert.equal(toAppIsoDate(soldAt), '2026-10-14')
    assert.equal(soldAt.toUTC().toISODate(), '2026-10-15')

    const { fromSql, toExclusiveSql } = datetimeRangeUtcSql('2026-10-14', '2026-10-14')
    const utcSql = soldAt.toUTC().toFormat('yyyy-MM-dd HH:mm:ss')
    assert.isTrue(utcSql >= fromSql)
    assert.isTrue(utcSql < toExclusiveSql)

    const nextDay = datetimeRangeUtcSql('2026-10-15', '2026-10-15')
    assert.isFalse(utcSql >= nextDay.fromSql && utcSql < nextDay.toExclusiveSql)
  })

  test('sqlDateToIsoDate keeps the DATE calendar day without shifting to Caracas', ({ assert }) => {
    // mysql2 returns DATE columns as a JS Date at process-local midnight.
    assert.equal(sqlDateToIsoDate(new Date(2026, 9, 15)), '2026-10-15')
    assert.equal(sqlDateToIsoDate(new Date(2026, 0, 1)), '2026-01-01')
    assert.equal(sqlDateToIsoDate('2026-10-15'), '2026-10-15')
    assert.equal(sqlDateToIsoDate('2026-10-15 00:00:00'), '2026-10-15')
    assert.isNull(sqlDateToIsoDate(null))
    assert.isNull(sqlDateToIsoDate(undefined))
    assert.isNull(sqlDateToIsoDate(''))
  })
})
