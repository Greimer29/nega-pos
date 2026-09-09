import type Purchase from '#models/purchase'
import type PurchaseItem from '#models/purchase_item'
import type Material from '#models/material'
import type CatalogProduct from '#models/catalog_product'
import { serializeAccountResumen } from '#transformers/account_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'

export type PurchaseExtra = {
  items?: ReturnType<typeof serializePurchaseItem>[]
}

function serializeMaterialResumen(material: Material) {
  return {
    id: Number(material.id),
    code: material.code,
    name: material.name,
    category: material.category,
    unit: material.unit,
  }
}

function serializeCatalogProductResumen(product: CatalogProduct) {
  return {
    id: Number(product.id),
    name: product.name,
    category: product.category,
    saleUnit: product.saleUnit,
  }
}

function serializePurchaseItem(item: PurchaseItem) {
  return {
    id: Number(item.id),
    purchaseId: Number(item.purchaseId),
    materialId: item.materialId ? Number(item.materialId) : null,
    catalogProductId: item.catalogProductId ? Number(item.catalogProductId) : null,
    itemType: item.catalogProductId ? 'product' : 'material',
    quantity: item.quantity,
    unitPriceUsd: item.unitPriceUsd,
    unitPriceBs: item.unitPriceBs,
    subtotalUsd: item.subtotalUsd,
    subtotalBs: item.subtotalBs,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    ...(item.material ? { material: serializeMaterialResumen(item.material) } : {}),
    ...(item.catalogProduct
      ? { catalogProduct: serializeCatalogProductResumen(item.catalogProduct) }
      : {}),
  }
}

export default class PurchaseTransformer extends BaseTransformer<Purchase> {
  toObject(extra: PurchaseExtra = {}) {
    return {
      id: Number(this.resource.id),
      supplierId: this.resource.supplierId ? Number(this.resource.supplierId) : null,
      accountId: this.resource.accountId ? Number(this.resource.accountId) : null,
      date: this.resource.date.toISODate(),
      receivedDate: this.resource.receivedDate?.toISODate() ?? null,
      invoiceNumber: this.resource.invoiceNumber,
      tieneFactura: Boolean(this.resource.invoiceFile),
      usdRate: this.resource.usdRate,
      entryCurrencyCode: this.resource.entryCurrencyCode,
      totalBs: this.resource.totalBs,
      totalUsd: this.resource.totalUsd,
      status: this.resource.status,
      isCredit: Boolean(this.resource.isCredit),
      affectsInventory: this.resource.affectsInventory !== false,
      creditDueDate: this.resource.creditDueDate?.toISODate() ?? null,
      amountPaidUsd: this.resource.amountPaidUsd,
      balanceUsd: this.resource.balanceUsd,
      voidedAt: this.resource.voidedAt,
      notes: this.resource.notes,
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt,
      ...(this.resource.account ? { account: serializeAccountResumen(this.resource.account) } : {}),
      ...(extra.items ? { items: extra.items } : {}),
    }
  }
}

export function serializePurchase(purchase: Purchase, extra: PurchaseExtra = {}) {
  return new PurchaseTransformer(purchase).toObject(extra)
}

export function serializePurchaseItems(items: PurchaseItem[]) {
  return items.map(serializePurchaseItem)
}
