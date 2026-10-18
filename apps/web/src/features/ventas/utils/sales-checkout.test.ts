import { describe, expect, it, vi } from 'vitest'
import type { Material } from '@/features/materials/types'
import type { CatalogProduct, Sale } from '@/features/ventas/types'
import {
  buildSaleDraftPayload,
  buildSaleLines,
  finalizeSaleConfirmation,
  persistSaleDraft,
} from '@/features/ventas/utils/sales-checkout'
import type { CartLine } from '@/features/ventas/utils/ventas-cart-lines'

const sampleProduct: CatalogProduct = {
  id: 12,
  name: 'Producto',
  description: null,
  category: 'General',
  sale_unit: 'UND',
  formula_id: null,
  image_path: null,
  sale_price_usd: '8.50',
  previous_sale_price_usd: null,
  cost_usd: '4.00',
  stock_quantity: '10',
  minimum_stock: '0',
  active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const sampleMaterial: Material = {
  id: 6,
  code: 'MAT-6',
  name: 'Material',
  description: null,
  category: 'Otros',
  unit: 'UND',
  minimumStock: '0',
  location: null,
  defaultSupplierId: null,
  lastPurchasePrice: null,
  lastPurchasePriceUsd: null,
  salePriceUsd: '2.25',
  lastPurchaseDate: null,
  imagePath: null,
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('sales checkout', () => {
  it('builds product and material line payloads with optional fields normalized', () => {
    const cart: CartLine[] = [
      {
        id: 'product-1',
        kind: 'catalog',
        product: sampleProduct,
        quantity: 2,
        detail: '  Bordado  ',
        kitchenNote: '  Sin cebolla  ',
        isWholesale: true,
        catalogProductSizeId: 5,
        size: 'M',
        formulaMaterials: [{ material_id: 9, quantity_per_unit: 0.5 }],
      },
      {
        id: 'material-1',
        kind: 'material',
        material: sampleMaterial,
        quantity: 3,
      },
    ]

    expect(buildSaleLines(cart)).toEqual([
      {
        catalog_product_id: 12,
        quantity: 2,
        unit_price_usd: 8.5,
        is_wholesale: true,
        description: 'Bordado',
        catalog_product_size_id: 5,
        size: 'M',
        kitchen_note: 'Sin cebolla',
        formula_materials: [{ material_id: 9, quantity_per_unit: 0.5 }],
      },
      {
        material_id: 6,
        quantity: 3,
        unit_price_usd: 2.25,
      },
    ])
  })

  it('builds a draft payload and rejects an empty cart', () => {
    const product: CartLine = {
      id: 'product-1',
      kind: 'catalog',
      product: sampleProduct,
      quantity: 1,
    }

    expect(
      buildSaleDraftPayload({
        cart: [product],
        client: { guest_name: 'Cliente' },
        paymentType: 'CASH',
        billingMode: 'FAST',
        discountUsd: 1,
      })
    ).toMatchObject({
      guest_name: 'Cliente',
      payment_type: 'CASH',
      billing_mode: 'FAST',
      discount_usd: 1,
      lines: [{ catalog_product_id: 12, unit_price_usd: 8.5 }],
    })

    expect(() =>
      buildSaleDraftPayload({
        cart: [],
        client: { guest_name: 'Cliente' },
        paymentType: 'CASH',
        billingMode: 'FAST',
        discountUsd: 0,
      })
    ).toThrow('Agregá al menos un producto al carrito.')
  })

  it('updates an existing draft without creating a second sale', async () => {
    const updateSale = vi.fn().mockResolvedValue(undefined)
    const createSale = vi.fn()
    const onCreated = vi.fn()
    const payload = {
      guest_name: 'Cliente',
      lines: [],
    }

    await expect(
      persistSaleDraft({
        sourceSaleId: 25,
        payload,
        updateSale,
        createSale,
        onCreated,
      })
    ).resolves.toBe(25)
    expect(updateSale).toHaveBeenCalledWith(25, payload)
    expect(createSale).not.toHaveBeenCalled()
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('creates a new draft and records its valid ID', async () => {
    const onCreated = vi.fn()
    await expect(
      persistSaleDraft({
        sourceSaleId: null,
        payload: { guest_name: 'Cliente', lines: [] },
        updateSale: vi.fn(),
        createSale: vi.fn().mockResolvedValue({ id: 7 }),
        onCreated,
      })
    ).resolves.toBe(7)
    expect(onCreated).toHaveBeenCalledWith(7)
  })

  it('rejects create responses without a valid sale ID', async () => {
    await expect(
      persistSaleDraft({
        sourceSaleId: null,
        payload: { guest_name: 'Cliente', lines: [] },
        updateSale: vi.fn(),
        createSale: vi.fn().mockResolvedValue({ id: 0 }),
        onCreated: vi.fn(),
      })
    ).rejects.toThrow('No se pudo guardar el borrador: la API no devolvió un ID válido.')
  })

  it('confirms a sale, clears its draft and navigates after printing', async () => {
    const sale = { id: 7 } as Sale
    const confirmSale = vi.fn().mockResolvedValue({ id: 7 })
    const clearDraft = vi.fn()
    const getSale = vi.fn().mockResolvedValue(sale)
    const printSale = vi.fn().mockResolvedValue({ errors: [] })
    const onNavigate = vi.fn()

    await finalizeSaleConfirmation({
      saleId: 7,
      paymentType: 'CASH',
      billingMode: 'FAST',
      payload: { payments: [] },
      confirmSale,
      clearDraft,
      getSale,
      printSale,
      formatPrintErrors: vi.fn(() => 'print issue'),
      getPrintErrorMessage: vi.fn(() => 'print issue'),
      onNavigate,
    })

    expect(confirmSale).toHaveBeenCalledWith(7, {
      payment_type: 'CASH',
      billing_mode: 'FAST',
      payments: [],
    })
    expect(clearDraft).toHaveBeenCalledOnce()
    expect(printSale).toHaveBeenCalledWith(sale)
    expect(onNavigate).toHaveBeenCalledWith(7, undefined)
  })

  it('still navigates and reports a print failure after successful confirmation', async () => {
    const onNavigate = vi.fn()
    await finalizeSaleConfirmation({
      saleId: 7,
      paymentType: 'CREDIT',
      billingMode: 'ORDER',
      confirmSale: vi.fn().mockResolvedValue({ id: 7 }),
      clearDraft: vi.fn(),
      getSale: vi.fn().mockRejectedValue(new Error('load failed')),
      printSale: vi.fn(),
      formatPrintErrors: vi.fn(() => 'print issue'),
      getPrintErrorMessage: vi.fn(() => 'load failed'),
      onNavigate,
    })

    expect(onNavigate).toHaveBeenCalledWith(7, 'load failed')
  })
})
