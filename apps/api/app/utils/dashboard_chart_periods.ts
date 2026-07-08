import type { DateTime } from 'luxon'

export type ChartBucket = {
  desde: string
  hasta: string
  label: string
}

export function buildDailyVentasBuckets(anchor: DateTime): ChartBucket[] {
  const weekStart = anchor.startOf('week')
  const buckets: ChartBucket[] = []

  for (let i = 0; i < 7; i++) {
    const day = weekStart.plus({ days: i })
    buckets.push({
      desde: day.toISODate()!,
      hasta: day.toISODate()!,
      label: day.setLocale('es').toFormat('ccc'),
    })
  }

  return buckets
}

export function buildWeeklyVentasBuckets(anchor: DateTime): ChartBucket[] {
  const buckets: ChartBucket[] = []

  for (let i = 7; i >= 0; i--) {
    const start = anchor.minus({ weeks: i }).startOf('week')
    const end = start.endOf('week')
    buckets.push({
      desde: start.toISODate()!,
      hasta: end.toISODate()!,
      label: String(8 - i),
    })
  }

  return buckets
}

export function buildMonthlyVentasBuckets(anchor: DateTime): ChartBucket[] {
  const buckets: ChartBucket[] = []

  for (let i = 5; i >= 0; i--) {
    const start = anchor.minus({ months: i }).startOf('month')
    const end = start.endOf('month')
    buckets.push({
      desde: start.toISODate()!,
      hasta: end.toISODate()!,
      label: start.setLocale('es').toFormat('MMMM'),
    })
  }

  return buckets
}
