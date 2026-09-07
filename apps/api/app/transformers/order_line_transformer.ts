import type OrderLine from '#models/order_line'
import { serializeCatalogProduct } from '#transformers/catalog_product_transformer'

export function serializeOrderLine(line: OrderLine) {
  return {
    id: Number(line.id),
    order_id: Number(line.orderId),
    catalog_product_id: Number(line.catalogProductId),
    catalog_product_size_id: line.catalogProductSizeId ? Number(line.catalogProductSizeId) : null,
    size: line.size ?? null,
    quantity: line.quantity,
    returned_quantity: line.returnedQuantity,
    unit_price_usd: line.unitPriceUsd,
    subtotal_usd: line.subtotalUsd,
    catalog_product: line.catalogProduct ? serializeCatalogProduct(line.catalogProduct) : undefined,
  }
}
