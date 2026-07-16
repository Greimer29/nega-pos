import { describe, expect, it } from 'vitest'
import {
  buildPurchaseItemPayload,
  inferPurchaseEntryCurrency,
  isPurchaseEntryInNative,
  nativeToUsd,
  purchaseEntryDecimals,
  usdToNative,
} from '@/features/purchases/utils/purchase-entry-currency'

describe('purchase-entry-currency', () => {
  it('converts entry currency to base using purchase rate', () => {
    expect(nativeToUsd(10000, 100)).toBe(100)
    expect(usdToNative(100, 100, 'USD')).toBe(10000)
    expect(nativeToUsd(4000, 4000)).toBe(1)
    expect(usdToNative(1, 4000, 'VES')).toBe(4000)
  })

  it('builds item payload with native snapshot for non-base entry', () => {
    const payload = buildPurchaseItemPayload(
      {
        itemType: 'material',
        materialId: 1,
        quantity: 2,
        unitPriceUsd: 0.1,
      },
      'USD',
      100,
      10,
      'XAU'
    )

    expect(payload).toEqual({
      material_id: 1,
      quantity: 2,
      unit_price_usd: 0.1,
      unit_price_bs: 10,
    })
  })

  it('builds base-only payload without native snapshot', () => {
    const payload = buildPurchaseItemPayload(
      {
        itemType: 'product',
        catalogProductId: 5,
        quantity: 1,
        unitPriceUsd: 0.125,
      },
      'XAU',
      1,
      undefined,
      'XAU'
    )

    expect(payload).toEqual({
      catalog_product_id: 5,
      quantity: 1,
      unit_price_usd: 0.125,
    })
  })

  it('infers legacy purchase entry currency', () => {
    expect(inferPurchaseEntryCurrency({ entryCurrencyCode: 'EUR', usdRate: '0.9200' })).toBe('EUR')
    expect(inferPurchaseEntryCurrency({ usdRate: '36.5000' })).toBe('VES')
    expect(inferPurchaseEntryCurrency({}, 'XAU')).toBe('XAU')
  })

  it('detects native entry mode against base currency', () => {
    expect(isPurchaseEntryInNative('XAU', 'XAU')).toBe(false)
    expect(isPurchaseEntryInNative('USD', 'XAU')).toBe(true)
    expect(isPurchaseEntryInNative('VES', 'XAU')).toBe(true)
  })

  it('uses 4 decimals for XAU entry amounts', () => {
    expect(purchaseEntryDecimals('XAU')).toBe(4)
    expect(purchaseEntryDecimals('USD')).toBe(2)
    expect(purchaseEntryDecimals('VES')).toBe(2)
    expect(usdToNative(0.1234, 1, 'XAU')).toBe(0.1234)
  })
})
