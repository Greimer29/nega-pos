export const CATALOG_PRODUCT_CODE_LENGTH = 7

export function formatCatalogProductCode(productId: number): string {
  return String(productId).padStart(CATALOG_PRODUCT_CODE_LENGTH, '0')
}

export function catalogProductIdFromCode(code: string): number | null {
  const trimmed = code.trim()

  if (trimmed.length > CATALOG_PRODUCT_CODE_LENGTH || !/^\d+$/.test(trimmed)) {
    return null
  }

  const id = Number(trimmed)
  if (!Number.isSafeInteger(id) || id <= 0) {
    return null
  }

  return formatCatalogProductCode(id) === trimmed ? id : null
}
