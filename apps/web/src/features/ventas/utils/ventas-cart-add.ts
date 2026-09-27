import {
  formulaMaterialsSignature,
  type SaleLineFormulaMaterial,
} from '@/features/ventas/utils/sale-line-formula'

/**
 * Regla de carrito al agregar desde catálogo (click / barcode):
 * - Si ya hay línea **detal** (sin mayorista) del mismo ítem → suma 1 a esa cantidad.
 * - Si la única línea del ítem tiene **mayorista** marcado → crea una 2.ª línea detal
 *   (no incrementa paquetes).
 * - Si no hay línea → crea línea detal qty 1.
 *
 * Así se mantiene el merge histórico y solo se bifurca mayorista/detal cuando hace falta.
 */

type CatalogLineLike = {
  id: string
  kind: string
  product?: { id: number | string }
  quantity: number
  catalogProductSizeId?: number | null
  isWholesale?: boolean
  formulaMaterials?: SaleLineFormulaMaterial[] | null
}

type MaterialLineLike = {
  id: string
  kind: string
  material?: { id: number | string }
  quantity: number
  isWholesale?: boolean
}

function sameId(a: number | string, b: number | string): boolean {
  return Number(a) === Number(b)
}

export function findMergeableRetailCatalogLine<T extends CatalogLineLike>(
  lines: T[],
  productId: number | string,
  options?: {
    catalogProductSizeId?: number | null
    formulaMaterials?: SaleLineFormulaMaterial[] | null
  }
): T | undefined {
  const sizeId = options?.catalogProductSizeId ?? null
  const formulaSig = formulaMaterialsSignature(options?.formulaMaterials ?? null)

  return lines.find((line) => {
    if (line.kind !== 'catalog' || !line.product) return false
    if (!sameId(line.product.id, productId)) return false
    if (line.isWholesale) return false
    if (Number(line.catalogProductSizeId ?? 0) !== Number(sizeId ?? 0)) return false
    return formulaMaterialsSignature(line.formulaMaterials) === formulaSig
  })
}

export function findMergeableRetailMaterialLine<T extends MaterialLineLike>(
  lines: T[],
  materialId: number | string
): T | undefined {
  return lines.find(
    (line) =>
      line.kind === 'material' &&
      line.material != null &&
      sameId(line.material.id, materialId) &&
      !line.isWholesale
  )
}

export function incrementOrAppendCartLine<T extends { id: string; quantity: number }>(
  prev: T[],
  existing: T | undefined,
  createLine: () => T
): T[] {
  if (existing) {
    return prev.map((line) =>
      line.id === existing.id ? { ...line, quantity: line.quantity + 1 } : line
    )
  }
  return [...prev, createLine()]
}

/** Producto sin tallas: merge detal o nueva línea detal. */
export function addSimpleCatalogProductToCart<T extends CatalogLineLike>(
  prev: T[],
  product: { id: number | string },
  createLine: () => T
): T[] {
  const existing = findMergeableRetailCatalogLine(prev, product.id, {
    catalogProductSizeId: null,
    formulaMaterials: null,
  })
  return incrementOrAppendCartLine(prev, existing, createLine)
}

/** Producto con talla: merge por talla (mayorista no aplica con tallas). */
export function addSizedCatalogProductToCart<T extends CatalogLineLike>(
  prev: T[],
  product: { id: number | string },
  size: { id: number | string; size: string },
  createLine: () => T
): T[] {
  const existing = findMergeableRetailCatalogLine(prev, product.id, {
    catalogProductSizeId: Number(size.id),
    formulaMaterials: null,
  })
  return incrementOrAppendCartLine(prev, existing, createLine)
}

export function addMaterialToCartLines<T extends MaterialLineLike>(
  prev: T[],
  material: { id: number | string },
  createLine: () => T
): T[] {
  const existing = findMergeableRetailMaterialLine(prev, material.id)
  return incrementOrAppendCartLine(prev, existing, createLine)
}
