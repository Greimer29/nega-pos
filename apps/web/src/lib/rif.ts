/**
 * Normaliza RIF venezolano: mayúsculas y sin espacios ni guiones.
 */
export function normalizeRif(value: string): string {
  return value.replace(/[\s-]+/g, '').toUpperCase()
}
