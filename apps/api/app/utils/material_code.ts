import { CATALOG_PRODUCT_CODE_LENGTH } from '#utils/catalog_product_code'

export function formatMaterialCode(materialId: number): string {
  return `MAT-${String(materialId).padStart(CATALOG_PRODUCT_CODE_LENGTH, '0')}`
}
