import BarcodeDuplicadoException from '#exceptions/barcode_duplicado_exception'
import CatalogProduct from '#models/catalog_product'
import Material from '#models/material'

export const BARCODE_MAX_LENGTH = 64

/** Trim; empty → null. Caps at BARCODE_MAX_LENGTH. */
export function normalizeBarcode(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  return trimmed.slice(0, BARCODE_MAX_LENGTH)
}

export async function assertProductBarcodeAvailable(
  barcode: string | null,
  excludeProductId?: number
): Promise<void> {
  if (!barcode) {
    return
  }
  const query = CatalogProduct.query().where('barcode', barcode)
  if (excludeProductId) {
    query.whereNot('id', excludeProductId)
  }
  if (await query.first()) {
    throw new BarcodeDuplicadoException()
  }
}

export async function assertMaterialBarcodeAvailable(
  barcode: string | null,
  excludeMaterialId?: number
): Promise<void> {
  if (!barcode) {
    return
  }
  const query = Material.query().where('barcode', barcode)
  if (excludeMaterialId) {
    query.whereNot('id', excludeMaterialId)
  }
  if (await query.first()) {
    throw new BarcodeDuplicadoException()
  }
}
