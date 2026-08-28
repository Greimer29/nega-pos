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
