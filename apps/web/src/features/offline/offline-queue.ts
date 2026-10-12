import {
  createOfflineClientId,
  deleteOfflineOperationFile,
  listOfflineOperationFileNames,
  operationFileName,
  readOfflineOperationFile,
  writeOfflineOperationFile,
} from '@/features/offline/offline-storage'
import type { OfflineReturnOperation, OfflineSaleOperation } from '@/features/offline/types'
import {
  readOfflineCatalogSnapshot,
  writeOfflineCatalogSnapshot,
} from '@/features/offline/offline-storage'

export type PendingOfflineSale = {
  fileName: string
  operation: OfflineSaleOperation
  totalUsd: number
}

function lineTotal(line: OfflineSaleOperation['lines'][number]): number {
  return Number(line.quantity) * Number(line.unit_price_usd)
}

export function offlineSaleTotalUsd(operation: OfflineSaleOperation): number {
  const subtotal = operation.lines.reduce((sum, line) => sum + lineTotal(line), 0)
  return Math.max(0, subtotal - Number(operation.discount_usd || 0))
}

export async function listPendingOfflineSales(): Promise<PendingOfflineSale[]> {
  const files = await listOfflineOperationFileNames()
  const sales: PendingOfflineSale[] = []

  for (const fileName of files) {
    if (!fileName.startsWith('venta-')) {
      continue
    }
    const operation = await readOfflineOperationFile(fileName)
    if (!operation || operation.type !== 'sale') {
      continue
    }
    sales.push({
      fileName,
      operation,
      totalUsd: offlineSaleTotalUsd(operation),
    })
  }

  return sales.sort((a, b) => b.operation.sold_at.localeCompare(a.operation.sold_at))
}

export async function countPendingOfflineOperations(): Promise<number> {
  const files = await listOfflineOperationFileNames()
  return files.length
}

/** Full return of a sale that only exists on disk: delete the file and restore local stock. */
export async function returnPendingOfflineSaleFully(fileName: string): Promise<void> {
  const operation = await readOfflineOperationFile(fileName)
  if (!operation || operation.type !== 'sale') {
    throw new Error('Venta offline no encontrada')
  }

  const catalog = await readOfflineCatalogSnapshot()
  if (catalog) {
    await writeOfflineCatalogSnapshot(restoreLocalStock(catalog, operation.lines))
  }

  await deleteOfflineOperationFile(fileName)
}

function restoreLocalStock(
  catalog: NonNullable<Awaited<ReturnType<typeof readOfflineCatalogSnapshot>>>,
  lines: OfflineSaleOperation['lines']
) {
  const next = structuredClone(catalog)
  for (const line of lines) {
    const packs = Number(line.quantity)
    const product = line.catalog_product_id
      ? next.products.find((row) => row.id === line.catalog_product_id)
      : null
    const units =
      line.is_wholesale && product?.wholesale_units_per_pack
        ? packs * product.wholesale_units_per_pack
        : packs

    if (product && product.item_kind !== 'SERVICE') {
      if (product.formula_materials.length > 0) {
        const materials =
          line.formula_materials && line.formula_materials.length > 0
            ? line.formula_materials
            : product.formula_materials
        for (const formulaItem of materials) {
          const material = next.materials.find((row) => row.id === formulaItem.material_id)
          if (material) {
            material.stock_quantity += units * formulaItem.quantity_per_unit
          }
        }
      } else {
        product.stock_quantity += units
        if (line.catalog_product_size_id) {
          const size = product.sizes.find((row) => row.id === line.catalog_product_size_id)
          if (size) {
            size.stock_quantity = String(Number(size.stock_quantity) + units)
          }
        }
      }
    }

    if (line.material_id) {
      const material = next.materials.find((row) => row.id === line.material_id)
      if (material) {
        material.stock_quantity += units
      }
    }
  }
  return next
}

/**
 * Partial return: reduce quantities on the local sale file.
 * `returns` indexes match `operation.lines`.
 */
export async function returnPendingOfflineSalePartial(
  fileName: string,
  returns: Array<{ lineIndex: number; quantity: number }>
): Promise<OfflineSaleOperation> {
  const operation = await readOfflineOperationFile(fileName)
  if (!operation || operation.type !== 'sale') {
    throw new Error('Venta offline no encontrada')
  }

  const nextLines = operation.lines.map((line) => ({ ...line }))
  const deducted: OfflineSaleOperation['lines'] = []

  for (const item of returns) {
    const line = nextLines[item.lineIndex]
    if (!line) {
      throw new Error('Línea offline inválida')
    }
    const available = Number(line.quantity)
    if (item.quantity <= 0 || item.quantity > available + 0.0005) {
      throw new Error('Cantidad a devolver inválida')
    }
    deducted.push({ ...line, quantity: item.quantity })
    line.quantity = Number((available - item.quantity).toFixed(4))
  }

  const remaining = nextLines.filter((line) => Number(line.quantity) > 0.0005)
  if (remaining.length === 0) {
    await returnPendingOfflineSaleFully(fileName)
    return operation
  }

  const subtotal = remaining.reduce((sum, line) => sum + lineTotal(line), 0)
  const discount = Math.min(Number(operation.discount_usd || 0), subtotal)
  const updated: OfflineSaleOperation = {
    ...operation,
    lines: remaining,
    discount_usd: discount,
    payments:
      operation.payment_type === 'CASH' && operation.payments && operation.payments.length === 1
        ? [
            {
              ...operation.payments[0],
              amount_usd: Math.max(0, subtotal - discount),
            },
          ]
        : operation.payments,
  }

  const catalog = await readOfflineCatalogSnapshot()
  if (catalog) {
    await writeOfflineCatalogSnapshot(restoreLocalStock(catalog, deducted))
  }

  await writeOfflineOperationFile(fileName, updated)
  return updated
}

/** Queue a return for a sale already on the server (sync when online). */
export async function queueSyncedSaleReturnOffline(input: {
  saleId: number
  lines?: Array<{ line_id: number; quantity: number }>
}): Promise<void> {
  const operation: OfflineReturnOperation = {
    type: 'return',
    offline_client_id: createOfflineClientId(),
    sale_id: input.saleId,
    lines: input.lines,
  }
  await writeOfflineOperationFile(operationFileName(operation), operation)
}
