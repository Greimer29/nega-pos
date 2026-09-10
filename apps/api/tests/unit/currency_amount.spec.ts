import {
  formatNativeAmount,
  formatSaleNativeTotal,
  nativeCurrencyDecimals,
} from '#utils/currency_amount'
import { test } from '@japa/runner'

test.group('currency_amount', () => {
  test('uses 4 decimals for XAU', ({ assert }) => {
    assert.equal(nativeCurrencyDecimals('XAU'), 4)
    assert.equal(formatNativeAmount(0.02, 'XAU'), '0.0200')
    assert.equal(formatNativeAmount(0.0004, 'XAU'), '0.0004')
  })

  test('formatSaleNativeTotal with XAU base keeps same amount when paying in XAU', ({ assert }) => {
    assert.equal(formatSaleNativeTotal(50, 'XAU', 1, 'XAU'), '50.0000')
    assert.equal(formatSaleNativeTotal(0.5, 'XAU', 1, 'XAU'), '0.5000')
  })

  test('formatSaleNativeTotal converts base XAU to USD with rate 100', ({ assert }) => {
    assert.equal(formatSaleNativeTotal(0.5, 'USD', 100, 'XAU'), '50.00')
    assert.equal(formatSaleNativeTotal(1, 'USD', 100, 'XAU'), '100.00')
  })

  test('VES keeps 2 decimals from base', ({ assert }) => {
    assert.equal(formatSaleNativeTotal(10, 'VES', 40, 'XAU'), '400.00')
  })
})
