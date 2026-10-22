import CurrencyService from '#services/currency_service'
import { machineExpenseRowUsd, sumMachineExpenseRowsUsd } from '#utils/machine_expense_totals'
import { test } from '@japa/runner'

const currencyService = new CurrencyService()
// Base XAU: 1 XAU = 100 USD = 4000 VES.
const rates = { XAU: 1, USD: 100, VES: 4000 }

test.group('machine expense totals', () => {
  test('converts one legacy row to base currency', ({ assert }) => {
    assert.closeTo(
      machineExpenseRowUsd({ amount: '50', currency_code: 'USD' }, rates, currencyService),
      0.5,
      1e-9
    )
    assert.closeTo(
      machineExpenseRowUsd({ amount: '8000', currency_code: 'VES' }, rates, currencyService),
      2,
      1e-9
    )
    assert.closeTo(
      machineExpenseRowUsd({ amount: 3, currency_code: 'XAU' }, rates, currencyService),
      3,
      1e-9
    )
  })

  test('defaults a missing currency to USD and normalizes case', ({ assert }) => {
    assert.closeTo(
      machineExpenseRowUsd({ amount: '100', currency_code: null }, rates, currencyService),
      1,
      1e-9
    )
    assert.closeTo(machineExpenseRowUsd({ amount: '100' }, rates, currencyService), 1, 1e-9)
    assert.closeTo(
      machineExpenseRowUsd({ amount: '100', currency_code: '' }, rates, currencyService),
      1,
      1e-9
    )
    assert.closeTo(
      machineExpenseRowUsd({ amount: '4000', currency_code: 'ves' }, rates, currencyService),
      1,
      1e-9
    )
  })

  test('sums rows in different currencies', ({ assert }) => {
    const total = sumMachineExpenseRowsUsd(
      [
        { amount: '50', currency_code: 'USD' },
        { amount: '8000', currency_code: 'VES' },
        { amount: '1', currency_code: 'XAU' },
      ],
      rates,
      currencyService
    )
    assert.closeTo(total, 3.5, 1e-9)
    assert.equal(sumMachineExpenseRowsUsd([], rates, currencyService), 0)
  })
})
