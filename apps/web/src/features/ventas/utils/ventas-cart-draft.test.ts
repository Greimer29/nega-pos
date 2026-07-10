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
      cart: [{ product: sampleProduct, quantity: 2 }],
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
    expect(restored?.cart[0]?.product.name).toBe('Camisa')
    expect(restored?.cart[0]?.quantity).toBe(2)
    expect(restored?.customerId).toBe(5)
    expect(restored?.clientName).toBe('Cliente demo')
  })

  it('clears stored draft', () => {
    saveVentasCartDraft({
      cart: [{ product: sampleProduct, quantity: 1 }],
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
