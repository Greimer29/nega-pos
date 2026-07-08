import type CatalogProduct from '#models/catalog_product'
import type ProductInventoryMovement from '#models/product_inventory_movement'
import { serializeFormulaDetail } from '#transformers/formula_transformer'

export function serializeProductMovimiento(movimiento: ProductInventoryMovement) {
  return {
    id: Number(movimiento.id),
    type: movimiento.type,
    quantity: movimiento.quantity,
    note: movimiento.note,
    purchase_item_id: movimiento.purchaseItemId ? Number(movimiento.purchaseItemId) : null,
    order_id: movimiento.orderId ? Number(movimiento.orderId) : null,
    sale_id: movimiento.saleId ? Number(movimiento.saleId) : null,
    created_at: movimiento.createdAt.toISO(),
  }
}

export function serializeProductMovimientos(movimientos: ProductInventoryMovement[]) {
  return movimientos.map(serializeProductMovimiento)
}

export function serializeCatalogProduct(
  product: CatalogProduct,
  extras?: { soldQty?: number; stock?: CatalogProductStockExtras; costUsd?: string }
) {
  const stockQuantity = extras?.stock?.quantity ?? product.stockQuantity
  const stockSource = extras?.stock?.source ?? (product.formulaId ? 'formula' : 'manual')

  return {
    id: Number(product.id),
    name: product.name,
    description: product.description,
    category: product.category,
    sale_unit: product.saleUnit,
    formula_id: product.formulaId ? Number(product.formulaId) : null,
    image_path: product.imagePath,
    sale_price_usd: product.salePriceUsd,
    previous_sale_price_usd: product.previousSalePriceUsd,
    cost_usd: extras?.costUsd ?? product.costUsd,
    stock_quantity: typeof stockQuantity === 'number' ? stockQuantity.toFixed(3) : stockQuantity,
    stock_source: stockSource,
    minimum_stock: product.minimumStock,
    active: product.active,
    sold_qty: extras?.soldQty,
    created_at: product.createdAt.toISO(),
    updated_at: product.updatedAt.toISO(),
  }
}

export type CatalogProductStockExtras = {
  quantity: number
  source: 'manual' | 'formula'
}

export function serializeCatalogProductDetail(
  product: CatalogProduct,
  extras?: {
    soldQty?: number
    movimientos?: ProductInventoryMovement[]
    stock?: CatalogProductStockExtras
    costUsd?: string
  }
) {
  return {
    ...serializeCatalogProduct(product, extras),
    formula: product.formula ? serializeFormulaDetail(product.formula) : null,
    ...(extras?.movimientos
      ? { movimientos: serializeProductMovimientos(extras.movimientos) }
      : {}),
  }
}
