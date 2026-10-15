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

/** Hoy en calendario local del navegador (`YYYY-MM-DD`), sin UTC de `toISOString`. */
export function todayLocalIsoDate(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Suma días al calendario local y devuelve `YYYY-MM-DD`. */
export function addLocalDaysIsoDate(days: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
