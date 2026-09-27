import { describe, expect, it } from 'vitest'
import {
  addMaterialToCartLines,
  addSimpleCatalogProductToCart,
  addSizedCatalogProductToCart,
  findMergeableRetailCatalogLine,
} from '@/features/ventas/utils/ventas-cart-add'

type CatalogLine = {
  id: string
  kind: 'catalog'
  product: { id: number }
  quantity: number
  catalogProductSizeId?: number | null
  size?: string | null
  isWholesale?: boolean
  formulaMaterials?: { material_id: number; quantity: number }[] | null
}

type MaterialLine = {
  id: string
  kind: 'material'
  material: { id: number }
  quantity: number
  isWholesale?: boolean
}

let seq = 0
function nextId() {
  seq += 1
  return `line-${seq}`
}

function catalogLine(
  productId: number,
  quantity: number,
  extras: Partial<CatalogLine> = {}
): CatalogLine {
  return {
    id: nextId(),
    kind: 'catalog',
    product: { id: productId },
    quantity,
    catalogProductSizeId: null,
    size: null,
    formulaMaterials: null,
    ...extras,
  }
}

describe('ventas-cart-add — merge detal vs 2.ª línea mayorista', () => {
  it('primer click crea una línea detal qty 1', () => {
    const next = addSimpleCatalogProductToCart([] as CatalogLine[], { id: 10 }, () =>
      catalogLine(10, 1)
    )
    expect(next).toHaveLength(1)
    expect(next[0]?.quantity).toBe(1)
    expect(next[0]?.isWholesale).toBeUndefined()
  })

  it('segundo click al mismo producto suma cantidad (no 2.ª línea)', () => {
    const cart = [catalogLine(10, 1)]
    const next = addSimpleCatalogProductToCart(cart, { id: 10 }, () => catalogLine(10, 1))
    expect(next).toHaveLength(1)
    expect(next[0]?.quantity).toBe(2)
  })

  it('si la línea tiene mayorista marcado, el click crea 2.ª línea detal', () => {
    const wholesale = catalogLine(10, 1, { isWholesale: true })
    const next = addSimpleCatalogProductToCart([wholesale], { id: 10 }, () => catalogLine(10, 1))
    expect(next).toHaveLength(2)
    expect(next[0]?.isWholesale).toBe(true)
    expect(next[0]?.quantity).toBe(1)
    expect(next[1]?.isWholesale).toBeUndefined()
    expect(next[1]?.quantity).toBe(1)
  })

  it('con mayorista + detal, el click siguiente suma a la línea detal', () => {
    const cart = [catalogLine(10, 1, { isWholesale: true }), catalogLine(10, 2)]
    const next = addSimpleCatalogProductToCart(cart, { id: 10 }, () => catalogLine(10, 1))
    expect(next).toHaveLength(2)
    expect(next[0]?.quantity).toBe(1)
    expect(next[1]?.quantity).toBe(3)
  })

  it('no mezcla productos distintos', () => {
    const cart = [catalogLine(10, 3)]
    const next = addSimpleCatalogProductToCart(cart, { id: 99 }, () => catalogLine(99, 1))
    expect(next).toHaveLength(2)
    expect(next[0]?.quantity).toBe(3)
    expect(next[1]?.product.id).toBe(99)
  })

  it('compara ids numéricos aunque uno venga como string', () => {
    const cart = [catalogLine(10, 1)]
    const next = addSimpleCatalogProductToCart(cart, { id: '10' as unknown as number }, () =>
      catalogLine(10, 1)
    )
    expect(next).toHaveLength(1)
    expect(next[0]?.quantity).toBe(2)
  })

  it('findMergeableRetailCatalogLine ignora líneas mayoristas', () => {
    const cart = [catalogLine(10, 2, { isWholesale: true })]
    expect(findMergeableRetailCatalogLine(cart, 10)).toBeUndefined()
  })
})

describe('ventas-cart-add — materiales', () => {
  it('merge detal y bifura si hay mayorista', () => {
    const material = { id: 5 }
    let cart: MaterialLine[] = [
      { id: 'm1', kind: 'material', material, quantity: 1 },
    ]
    cart = addMaterialToCartLines(cart, material, () => ({
      id: nextId(),
      kind: 'material',
      material,
      quantity: 1,
    }))
    expect(cart).toHaveLength(1)
    expect(cart[0]?.quantity).toBe(2)

    cart = [{ id: 'm1', kind: 'material', material, quantity: 1, isWholesale: true }]
    cart = addMaterialToCartLines(cart, material, () => ({
      id: nextId(),
      kind: 'material',
      material,
      quantity: 1,
    }))
    expect(cart).toHaveLength(2)
    expect(cart[1]?.isWholesale).toBeUndefined()
  })
})

describe('ventas-cart-add — tallas', () => {
  it('merge por misma talla; talla distinta crea otra línea', () => {
    const product = { id: 7 }
    let cart: CatalogLine[] = [
      catalogLine(7, 1, { catalogProductSizeId: 1, size: 'M' }),
    ]
    cart = addSizedCatalogProductToCart(cart, product, { id: 1, size: 'M' }, () =>
      catalogLine(7, 1, { catalogProductSizeId: 1, size: 'M' })
    )
    expect(cart).toHaveLength(1)
    expect(cart[0]?.quantity).toBe(2)

    cart = addSizedCatalogProductToCart(cart, product, { id: 2, size: 'L' }, () =>
      catalogLine(7, 1, { catalogProductSizeId: 2, size: 'L' })
    )
    expect(cart).toHaveLength(2)
  })
})
