import type { OfflineCatalogSnapshot } from '@/features/offline/types'
import type { CatalogProduct } from '@/features/ventas/types'
import type { Material } from '@/features/materials/types'
import type { ProductSaleUnit } from '@/features/ventas/constants'

export function mapOfflineProducts(
  catalog: OfflineCatalogSnapshot,
  options?: { itemKind?: 'PRODUCT' | 'SERVICE'; search?: string; category?: string }
): CatalogProduct[] {
  const search = options?.search?.trim().toLowerCase()
  const category = options?.category?.trim().toLowerCase()

  return catalog.products
    .filter((product) => {
      if (options?.itemKind && product.item_kind !== options.itemKind) {
        return false
      }
      if (category && product.category.toLowerCase() !== category) {
        return false
      }
      if (!search) {
        return true
      }
      return (
        product.name.toLowerCase().includes(search) ||
        (product.barcode?.toLowerCase().includes(search) ?? false)
      )
    })
    .map((product) => ({
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      description: null,
      category: product.category,
      item_kind: product.item_kind as 'PRODUCT' | 'SERVICE',
      is_service: product.item_kind === 'SERVICE',
      sale_unit: (product.sale_unit || 'UND') as ProductSaleUnit,
      formula_id: product.formula_id,
      image_path: null,
      sale_price_usd: product.sale_price_usd,
      previous_sale_price_usd: null,
      cost_usd: product.cost_usd,
      stock_quantity: String(product.stock_quantity),
      stock_source: product.formula_id ? ('formula' as const) : ('manual' as const),
      active: product.active,
      has_sizes: product.sizes.length > 0,
      wholesale_enabled: product.wholesale_enabled,
      wholesale_units_per_pack:
        product.wholesale_units_per_pack !== null
          ? String(product.wholesale_units_per_pack)
          : null,
      wholesale_cost_usd: product.wholesale_cost_usd,
      wholesale_sale_price_usd: product.wholesale_sale_price_usd,
      sizes: product.sizes.map((size) => ({
        id: size.id,
        catalog_product_id: product.id,
        size: size.size,
        stock_quantity: size.stock_quantity,
      })),
      formula: product.formula_id
        ? {
            id: product.formula_id,
            name: 'Fórmula',
            description: null,
            active: true,
            materials: product.formula_materials.map((item, index) => ({
              id: index + 1,
              material_id: item.material_id,
              quantity: String(item.quantity_per_unit),
              material: item.material_name
                ? {
                    id: item.material_id,
                    code: String(item.material_id),
                    name: item.material_name,
                    unit: 'UND',
                    last_purchase_price_usd: null,
                  }
                : undefined,
            })),
            created_at: catalog.generated_at,
            updated_at: catalog.generated_at,
          }
        : null,
      created_at: catalog.generated_at,
      updated_at: catalog.generated_at,
    }))
}

export function mapOfflineMaterials(
  catalog: OfflineCatalogSnapshot,
  options?: { search?: string }
): Material[] {
  const search = options?.search?.trim().toLowerCase()
  return catalog.materials
    .filter((material) => {
      if (!search) return true
      return (
        material.name.toLowerCase().includes(search) ||
        (material.barcode?.toLowerCase().includes(search) ?? false)
      )
    })
    .map((material) => ({
      id: material.id,
      code: String(material.id),
      barcode: material.barcode,
      name: material.name,
      description: null,
      category: 'GENERAL' as Material['category'],
      unit: (material.unit || 'UND') as Material['unit'],
      minimumStock: '0',
      stockActual: material.stock_quantity,
      location: null,
      defaultSupplierId: null,
      lastPurchasePrice: null,
      lastPurchasePriceUsd: material.last_purchase_price_usd,
      salePriceUsd: material.sale_price_usd,
      lastPurchaseDate: null,
      imagePath: null,
      active: material.active,
      createdAt: catalog.generated_at,
      updatedAt: catalog.generated_at,
    }))
}

export function applyLocalStockDeduction(
  catalog: OfflineCatalogSnapshot,
  lines: Array<{
    catalog_product_id?: number
    material_id?: number
    quantity: number
    is_wholesale?: boolean
    catalog_product_size_id?: number | null
    formula_materials?: Array<{ material_id: number; quantity_per_unit: number }>
  }>
): OfflineCatalogSnapshot {
  const next: OfflineCatalogSnapshot = structuredClone(catalog)

  for (const line of lines) {
    const packs = line.quantity
    const units =
      line.is_wholesale && line.catalog_product_id
        ? packs *
          (next.products.find((p) => p.id === line.catalog_product_id)?.wholesale_units_per_pack ||
            1)
        : packs

    if (line.catalog_product_id) {
      const product = next.products.find((row) => row.id === line.catalog_product_id)
      if (!product || product.item_kind === 'SERVICE') {
        continue
      }

      if (product.formula_materials.length > 0) {
        const materials =
          line.formula_materials && line.formula_materials.length > 0
            ? line.formula_materials
            : product.formula_materials
        for (const formulaItem of materials) {
          const material = next.materials.find((row) => row.id === formulaItem.material_id)
          if (material) {
            material.stock_quantity = Math.max(
              0,
              material.stock_quantity - units * formulaItem.quantity_per_unit
            )
          }
        }
      } else {
        product.stock_quantity = Math.max(0, product.stock_quantity - units)
        if (line.catalog_product_size_id) {
          const size = product.sizes.find((row) => row.id === line.catalog_product_size_id)
          if (size) {
            size.stock_quantity = String(
              Math.max(0, Number(size.stock_quantity) - units)
            )
          }
        }
      }
    }

    if (line.material_id) {
      const material = next.materials.find((row) => row.id === line.material_id)
      if (material) {
        material.stock_quantity = Math.max(0, material.stock_quantity - units)
      }
    }
  }

  return next
}
