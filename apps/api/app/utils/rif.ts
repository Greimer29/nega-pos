/**
 * Normaliza RIF venezolano: mayúsculas y sin espacios.
 */
export function normalizeRif(value: string): string {
  return value.replace(/[\s-]+/g, '').toUpperCase()
}
