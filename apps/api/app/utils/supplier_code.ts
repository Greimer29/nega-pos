export const SUPPLIER_CODE_MAX_LENGTH = 50

/** Trim; empty → null. Caps at SUPPLIER_CODE_MAX_LENGTH. */
export function normalizeSupplierCode(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  return trimmed.slice(0, SUPPLIER_CODE_MAX_LENGTH)
}
