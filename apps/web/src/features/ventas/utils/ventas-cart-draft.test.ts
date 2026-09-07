import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  clearVentasCartDraft,
  isVentasCartDraftEmpty,
  loadVentasCartDraft,
  saveVentasCartDraft,
} from '@/features/ventas/utils/ventas-cart-draft'
import type { CatalogProduct } from '@/features/ventas/types'

const sampleProduct: CatalogProduct = {
  id: 1,
  name: 'Camisa',
  description: null,
  category: 'Uniforme',
  sale_unit: 'UND',
  formula_id: null,
  image_path: null,
  sale_price_usd: '10.0000',
  previous_sale_price_usd: null,
  cost_usd: '5.0000',
  stock_quantity: '12.000',
  minimum_stock: '0.000',
  active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

function createSessionStorageMock() {
  const store = new Map<string, string>()

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  } satisfies Storage
}

describe('ventas-cart-draft', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: createSessionStorageMock(),
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'sessionStorage')
  })

  it('persists and restores cart draft in sessionStorage', () => {
    saveVentasCartDraft({
      cart: [{ id: 'line-1', kind: 'catalog', product: sampleProduct, quantity: 2, formulaMaterials: null }],
      customerId: 5,
      clientName: 'Cliente demo',
      customerCreditDays: 30,
      paymentType: 'CASH',
      billingMethod: 'FAST',
      sourceSaleId: null,
      sourceSaleLabel: null,
    })

    const restored = loadVentasCartDraft()
    expect(restored?.cart).toHaveLength(1)
    expect(restored?.cart[0]?.id).toBe('line-1')
    expect(restored?.cart[0]?.product.name).toBe('Camisa')
    expect(restored?.cart[0]?.quantity).toBe(2)
    expect(restored?.customerId).toBe(5)
    expect(restored?.clientName).toBe('Cliente demo')
  })

  it('persists custom formula materials in cart draft', () => {
    saveVentasCartDraft({
      cart: [
        {
          id: 'line-custom',
          kind: 'catalog',
          product: sampleProduct,
          quantity: 1,
          formulaMaterials: [{ material_id: 9, quantity_per_unit: 2.5 }],
        },
      ],
      customerId: '',
      clientName: '',
      customerCreditDays: null,
      paymentType: 'CASH',
      billingMethod: 'FAST',
      sourceSaleId: null,
      sourceSaleLabel: null,
    })

    const restored = loadVentasCartDraft()
    expect(restored?.cart[0]?.formulaMaterials).toEqual([
      { material_id: 9, quantity_per_unit: 2.5 },
    ])
  })

  it('persists custom unit price when formula adds materials', () => {
    saveVentasCartDraft({
      cart: [
        {
          id: 'line-priced',
          kind: 'catalog',
          product: sampleProduct,
          quantity: 1,
          formulaMaterials: [{ material_id: 9, quantity_per_unit: 2.5 }],
          unitPriceUsd: 18.75,
        },
      ],
      customerId: '',
      clientName: '',
      customerCreditDays: null,
      paymentType: 'CASH',
      billingMethod: 'FAST',
      sourceSaleId: null,
      sourceSaleLabel: null,
    })

    const restored = loadVentasCartDraft()
    expect(restored?.cart[0]?.unitPriceUsd).toBe(18.75)
  })

  it('persists kitchen note in cart draft', () => {
    saveVentasCartDraft({
      cart: [
        {
          id: 'line-note',
          kind: 'catalog',
          product: sampleProduct,
          quantity: 3,
          kitchenNote: '1 sin cebolla\n2 sin mostaza',
        },
      ],
      customerId: '',
      clientName: '',
      customerCreditDays: null,
      paymentType: 'CASH',
      billingMethod: 'FAST',
      sourceSaleId: null,
      sourceSaleLabel: null,
    })

    const restored = loadVentasCartDraft()
    expect(restored?.cart[0]?.kitchenNote).toBe('1 sin cebolla\n2 sin mostaza')
  })

  it('persists invoice discount in cart draft', () => {
    saveVentasCartDraft({
      cart: [{ id: 'line-disc', kind: 'catalog', product: sampleProduct, quantity: 1 }],
      customerId: '',
      clientName: '',
      customerCreditDays: null,
      paymentType: 'CASH',
      billingMethod: 'FAST',
      sourceSaleId: null,
      sourceSaleLabel: null,
      invoiceDiscountUsd: 3.5,
    })

    const restored = loadVentasCartDraft()
    expect(restored?.invoiceDiscountUsd).toBe(3.5)
  })

  it('clears stored draft', () => {
    saveVentasCartDraft({
      cart: [{ id: 'line-2', kind: 'catalog', product: sampleProduct, quantity: 1 }],
      customerId: '',
      clientName: '',
      customerCreditDays: null,
      paymentType: 'CASH',
      billingMethod: 'FAST',
      sourceSaleId: null,
      sourceSaleLabel: null,
    })

    clearVentasCartDraft()
    expect(loadVentasCartDraft()).toBeNull()
  })

  it('detects empty draft', () => {
    expect(
      isVentasCartDraftEmpty({
        cart: [],
        customerId: '',
        clientName: '',
        customerCreditDays: null,
        paymentType: 'CASH',
        billingMethod: 'FAST',
        sourceSaleId: null,
        sourceSaleLabel: null,
      })
    ).toBe(true)
  })
})
