import { DateTime } from 'luxon'

/** Shop calendar timezone. Venezuela has no DST (UTC-4). */
export const APP_TIMEZONE = 'America/Caracas'

export function nowInAppZone(): DateTime {
  return DateTime.now().setZone(APP_TIMEZONE)
}

export function todayIsoDate(): string {
  return nowInAppZone().toISODate()!
}

export function currentMonthRange(): { from: string; to: string } {
  const now = nowInAppZone()
  return {
    from: now.startOf('month').toISODate()!,
    to: now.endOf('month').toISODate()!,
  }
}

export function dayStartInAppZone(isoDate: string): DateTime {
  return DateTime.fromISO(isoDate, { zone: APP_TIMEZONE }).startOf('day')
}

export function dayEndInAppZone(isoDate: string): DateTime {
  return DateTime.fromISO(isoDate, { zone: APP_TIMEZONE }).endOf('day')
}

/** Calendar date (YYYY-MM-DD) of an instant in the shop timezone. */
export function toAppIsoDate(dt: DateTime): string {
  return dt.setZone(APP_TIMEZONE).toISODate()!
}

/** UTC SQL DATETIME for the start of a shop calendar day (00:00:00 America/Caracas). */
export function dayStartUtcSql(isoDate: string): string {
  return dayStartInAppZone(isoDate).toUTC().toFormat('yyyy-MM-dd HH:mm:ss')
}

/**
 * Inclusive shop calendar range [from, to] as UTC SQL bounds for DATETIME columns
 * stored in UTC. Half-open: `col >= fromSql AND col < toExclusiveSql` covers the
 * full local day (00:00:00 → 23:59:59.999…) without second-precision gaps.
 */
export function datetimeRangeUtcSql(
  fromIsoDate: string,
  toIsoDate: string
): { fromSql: string; toExclusiveSql: string } {
  const from = dayStartInAppZone(fromIsoDate).toUTC()
  const toExclusive = dayStartInAppZone(toIsoDate).plus({ days: 1 }).toUTC()
  return {
    fromSql: from.toFormat('yyyy-MM-dd HH:mm:ss'),
    toExclusiveSql: toExclusive.toFormat('yyyy-MM-dd HH:mm:ss'),
  }
}
