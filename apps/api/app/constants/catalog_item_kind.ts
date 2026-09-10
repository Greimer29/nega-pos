export const CATALOG_ITEM_KINDS = ['PRODUCT', 'SERVICE'] as const

export type CatalogItemKind = (typeof CATALOG_ITEM_KINDS)[number]

export function isCatalogService(product: { itemKind?: string | null }): boolean {
  return product.itemKind === 'SERVICE'
}
