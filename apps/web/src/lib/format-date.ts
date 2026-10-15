/** Zona calendario de tienda (Venezuela, sin DST). */
export const APP_TIMEZONE = 'America/Caracas'

/**
 * Formatea una fecha ISO (`YYYY-MM-DD` o datetime con `T`) a `DD/MM/YYYY`.
 * Usa la parte calendario del string (no convierte zona), para no correr el día
 * al formatear medianoche UTC en America/Caracas (columnas DATE).
 */
export function formatFecha(iso: string | null | undefined) {
  if (!iso) {
    return '—'
  }

  const datePart = iso.includes('T') ? iso.slice(0, 10) : iso.split(' ')[0]
  const [year, month, day] = datePart.split('-')

  if (!year || !month || !day) {
    return '—'
  }

  return `${day}/${month}/${year}`
}

/**
 * Fecha calendario de un instante (`sold_at`, `confirmed_at`, etc.) en zona de tienda.
 * No usar para columnas DATE serializadas como medianoche UTC.
 */
export function formatFechaInstante(iso: string | null | undefined) {
  if (!iso) {
    return '—'
  }

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleDateString('es-VE', {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Hoy en calendario de tienda (`YYYY-MM-DD`, America/Caracas).
 * No usar `toISOString().slice(0, 10)`: en VE (UTC-4) tras las 20:00 ya es el día
 * siguiente en UTC y se graba la fecha wrong en columnas DATE.
 */
export function todayLocalIsoDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Día calendario de tienda de un instante (`YYYY-MM-DD`). */
export function toAppIsoDate(instant: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)
}

/** Suma días a un `YYYY-MM-DD` (o al hoy de tienda) sin pasar por UTC de `toISOString`. */
export function addLocalDaysIsoDate(days: number, from: Date | string = new Date()): string {
  const baseIso = typeof from === 'string' ? from.slice(0, 10) : toAppIsoDate(from)
  const [year, month, day] = baseIso.split('-').map(Number)
  const utcNoon = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0))
  const y = utcNoon.getUTCFullYear()
  const m = String(utcNoon.getUTCMonth() + 1).padStart(2, '0')
  const d = String(utcNoon.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Fecha y hora en locale venezolano (zona de tienda).
 */
export function formatFechaHora(iso: string | null | undefined) {
  if (!iso) {
    return '—'
  }

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString('es-VE', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: APP_TIMEZONE,
  })
}
