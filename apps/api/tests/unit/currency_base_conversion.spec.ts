import CurrencyService from '#services/currency_service'
import { test } from '@japa/runner'

test.group('CurrencyService toBase/fromBase', () => {
  const service = new CurrencyService()
  const rates = { XAU: 1, USD: 100, VES: 4000 }

  test('toBase converts USD and VES into XAU', ({ assert }) => {
    assert.equal(service.toBase(100, 'USD', rates, 'XAU'), 1)
    assert.equal(service.toBase(4000, 'VES', rates, 'XAU'), 1)
    assert.equal(service.toBase(2.5, 'XAU', rates, 'XAU'), 2.5)
  })

  test('fromBase converts XAU into USD and VES', ({ assert }) => {
    assert.equal(service.fromBase(1, 'USD', rates, 'XAU'), 100)
    assert.equal(service.fromBase(1, 'VES', rates, 'XAU'), 4000)
    assert.equal(service.fromBase(0.25, 'XAU', rates, 'XAU'), 0.25)
  })

  test('toUsd/fromUsd aliases resolve base from rate=1', ({ assert }) => {
    assert.equal(service.toUsd(100, 'USD', rates), 1)
    assert.equal(service.fromUsd(1, 'USD', rates), 100)
  })
})
