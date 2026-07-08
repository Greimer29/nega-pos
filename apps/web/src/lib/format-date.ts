/**
 * Formatea una fecha ISO (`YYYY-MM-DD` o datetime con `T`) a `DD/MM/YYYY`.
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
 * Fecha y hora en locale venezolano.
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
  })
}
