import { Capacitor } from '@capacitor/core'
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerAndroidScanningLibrary,
  CapacitorBarcodeScannerTypeHint,
} from '@capacitor/barcode-scanner'
import { listCatalogProducts } from '@/features/ventas/services/catalog-service'
import { listMaterials } from '@/features/materials/services/material-service'
import type { CatalogProduct } from '@/features/ventas/types'
import type { Material } from '@/features/materials/types'

export type BarcodeLookupKind = 'product' | 'material'

export type BarcodeLookupResult =
  | { kind: 'product'; product: CatalogProduct }
  | { kind: 'material'; material: Material }

export function normalizeBarcodeInput(value: string): string {
  return value.trim()
}

/** True on Capacitor Android/iOS (native camera). Web also scans via the plugin's browser camera UI. */
export function isNativeBarcodeScanAvailable(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

/** Opens camera scanner (native APK or browser). Returns null if cancelled or unavailable. */
export async function scanBarcodeWithCamera(): Promise<string | null> {
  try {
    const result = await CapacitorBarcodeScanner.scanBarcode({
      hint: CapacitorBarcodeScannerTypeHint.ALL,
      scanInstructions: 'Apuntá al código de barras o QR',
      scanButton: false,
      cameraDirection: 1,
      scanOrientation: 3,
      android: { scanningLibrary: CapacitorBarcodeScannerAndroidScanningLibrary.MLKIT },
      web: {
        showCameraSelection: true,
        scannerFPS: 10,
      },
    })
    const code = normalizeBarcodeInput(result.ScanResult ?? '')
    return code || null
  } catch {
    return null
  }
}

export async function lookupProductByBarcode(code: string): Promise<CatalogProduct | null> {
  const barcode = normalizeBarcodeInput(code)
  if (!barcode) return null
  const data = await listCatalogProducts({
    page: 1,
    perPage: 5,
    barcode,
    itemKind: 'PRODUCT',
    active: true,
  })
  return data.catalog_products[0] ?? null
}

export async function lookupMaterialByBarcode(code: string): Promise<Material | null> {
  const barcode = normalizeBarcodeInput(code)
  if (!barcode) return null
  const data = await listMaterials({
    page: 1,
    perPage: 5,
    barcode,
    status: 'active',
  })
  return data.materials[0] ?? null
}

/** Product first, then material. */
export async function lookupInventoryBarcode(code: string): Promise<BarcodeLookupResult | null> {
  const product = await lookupProductByBarcode(code)
  if (product) return { kind: 'product', product }
  const material = await lookupMaterialByBarcode(code)
  if (material) return { kind: 'material', material }
  return null
}
