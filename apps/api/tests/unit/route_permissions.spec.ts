import { resolveRoutePermission } from '#permissions/route_permissions'
import { test } from '@japa/runner'

const PROTECTED_API_ROUTES: Array<[string, string]> = [
  ['POST', '/auth/logout'],
  ['GET', '/auth/me'],
  ['GET', '/customers'],
  ['GET', '/customers/42/account-statement'],
  ['GET', '/customers/42'],
  ['POST', '/customers'],
  ['PUT', '/customers/42'],
  ['DELETE', '/customers/42'],
  ['POST', '/customers/42/image'],
  ['GET', '/customers/42/image'],
  ['DELETE', '/customers/42/image'],
  ['POST', '/customers/42/payments'],
  ['GET', '/orders'],
  ['GET', '/orders/42'],
  ['POST', '/orders'],
  ['PUT', '/orders/42'],
  ['DELETE', '/orders/42'],
  ['POST', '/orders/42/transition'],
  ['POST', '/orders/42/return'],
  ['POST', '/orders/42/materials'],
  ['PUT', '/orders/42/materials/7'],
  ['DELETE', '/orders/42/materials/7'],
  ['POST', '/orders/42/lines'],
  ['PUT', '/orders/42/lines/7'],
  ['DELETE', '/orders/42/lines/7'],
  ['GET', '/orders/42/budget'],
  ['GET', '/orders/42/material-availability'],
  ['POST', '/orders/42/reference'],
  ['GET', '/orders/42/reference'],
  ['GET', '/suppliers'],
  ['GET', '/suppliers/42'],
  ['POST', '/suppliers'],
  ['PUT', '/suppliers/42'],
  ['DELETE', '/suppliers/42'],
  ['POST', '/suppliers/42/image'],
  ['GET', '/suppliers/42/image'],
  ['DELETE', '/suppliers/42/image'],
  ['GET', '/suppliers/42/account-statement'],
  ['POST', '/suppliers/42/payments'],
  ['GET', '/materials'],
  ['GET', '/materials/42'],
  ['POST', '/materials'],
  ['POST', '/materials/import'],
  ['PUT', '/materials/42'],
  ['DELETE', '/materials/42'],
  ['POST', '/materials/42/adjustment'],
  ['GET', '/materials/42/price-history'],
  ['POST', '/materials/42/image'],
  ['GET', '/materials/42/image'],
  ['DELETE', '/materials/42/image'],
  ['GET', '/purchases/summary'],
  ['GET', '/purchases'],
  ['GET', '/purchases/42'],
  ['POST', '/purchases'],
  ['PUT', '/purchases/42'],
  ['DELETE', '/purchases/42'],
  ['POST', '/purchases/42/confirm'],
  ['POST', '/purchases/42/return'],
  ['POST', '/purchases/42/invoice'],
  ['GET', '/purchases/42/invoice'],
  ['POST', '/purchases/42/items'],
  ['PUT', '/purchases/42/items/7'],
  ['DELETE', '/purchases/42/items/7'],
  ['GET', '/expenses/summary'],
  ['GET', '/expenses'],
  ['POST', '/expenses'],
  ['PUT', '/expenses/42'],
  ['DELETE', '/expenses/42'],
  ['GET', '/incomes/summary'],
  ['GET', '/incomes'],
  ['POST', '/incomes'],
  ['PUT', '/incomes/42'],
  ['DELETE', '/incomes/42'],
  ['GET', '/accounts'],
  ['GET', '/accounts/42'],
  ['POST', '/accounts'],
  ['PUT', '/accounts/42'],
  ['DELETE', '/accounts/42'],
  ['GET', '/currencies'],
  ['POST', '/currencies'],
  ['PUT', '/currencies/USD'],
  ['DELETE', '/currencies/USD'],
  ['GET', '/categories'],
  ['POST', '/categories'],
  ['PUT', '/categories/42'],
  ['DELETE', '/categories/42'],
  ['GET', '/reports/account-statement'],
  ['GET', '/reports/inventory'],
  ['GET', '/reports/inventory/42/movements'],
  ['GET', '/settings/exchange-rate'],
  ['PUT', '/settings/exchange-rate'],
  ['GET', '/settings/profit-margin'],
  ['PUT', '/settings/profit-margin'],
  ['GET', '/settings/general'],
  ['PUT', '/settings/general'],
  ['POST', '/settings/general/logo'],
  ['GET', '/settings/general/logo'],
  ['DELETE', '/settings/general/logo'],
  ['GET', '/settings/printing'],
  ['PUT', '/settings/printing'],
  ['GET', '/app-updates/latest'],
  ['GET', '/app-updates/download/desktop'],
  ['GET', '/app-updates/download/android'],
  ['GET', '/dashboard/summary'],
  ['GET', '/dashboard/overview'],
  ['GET', '/dashboard/daily-product-sales'],
  ['GET', '/dashboard/daily-expenses'],
  ['GET', '/dashboard/daily-closing'],
  ['GET', '/sales-shifts/current'],
  ['GET', '/sales-shifts'],
  ['POST', '/sales-shifts/open'],
  ['POST', '/sales-shifts/42/close'],
  ['GET', '/machines'],
  ['GET', '/machines/42'],
  ['POST', '/machines'],
  ['PUT', '/machines/42'],
  ['DELETE', '/machines/42'],
  ['GET', '/machines/42/expenses'],
  ['POST', '/machines/42/expenses'],
  ['GET', '/machine-expenses'],
  ['PUT', '/machine-expenses/42'],
  ['DELETE', '/machine-expenses/42'],
  ['POST', '/machine-expenses/42/receipt'],
  ['GET', '/machine-expenses/42/receipt'],
  ['GET', '/catalog-products'],
  ['POST', '/catalog-products/apply-profit-margin'],
  ['POST', '/catalog-products/import'],
  ['GET', '/catalog-products/42'],
  ['POST', '/catalog-products/42/adjustment'],
  ['POST', '/catalog-products'],
  ['PUT', '/catalog-products/42'],
  ['PUT', '/catalog-products/42/sizes'],
  ['DELETE', '/catalog-products/42'],
  ['POST', '/catalog-products/42/image'],
  ['GET', '/catalog-products/42/image'],
  ['DELETE', '/catalog-products/42/image'],
  ['GET', '/formulas'],
  ['GET', '/formulas/42'],
  ['POST', '/formulas'],
  ['PUT', '/formulas/42'],
  ['DELETE', '/formulas/42'],
  ['GET', '/formulas/42/materials'],
  ['PUT', '/formulas/42/materials'],
  ['GET', '/users'],
  ['GET', '/users/42'],
  ['POST', '/users'],
  ['PUT', '/users/42'],
  ['PATCH', '/users/42/active'],
  ['GET', '/sales'],
  ['GET', '/sales/42'],
  ['POST', '/sales'],
]

test.group('route_permissions', () => {
  test('every protected API route resolves to a permission or auth_only', ({ assert }) => {
    for (const [method, path] of PROTECTED_API_ROUTES) {
      const resolved = resolveRoutePermission(method, `/api/v1${path}`)
      assert.notEqual(
        resolved,
        'deny',
        `Missing permission rule for ${method} ${path} (resolved: deny)`
      )
    }
  })

  test('unknown protected paths resolve to deny', ({ assert }) => {
    assert.equal(resolveRoutePermission('GET', '/api/v1/unknown-endpoint'), 'deny')
    assert.equal(resolveRoutePermission('POST', '/api/v1/internal/debug'), 'deny')
  })

  test('auth session routes only require authentication', ({ assert }) => {
    assert.equal(resolveRoutePermission('GET', '/api/v1/auth/me'), 'auth_only')
    assert.equal(resolveRoutePermission('POST', '/api/v1/auth/logout'), 'auth_only')
  })

  test('categories routes accept settings or catalog permissions', ({ assert }) => {
    assert.deepEqual(resolveRoutePermission('GET', '/api/v1/categories'), [
      'catalog.view',
      'settings.view',
    ])
    assert.deepEqual(resolveRoutePermission('PUT', '/api/v1/categories/42'), [
      'catalog.edit',
      'settings.edit',
    ])
  })

  test('settings mutations accept view or edit permission', ({ assert }) => {
    assert.deepEqual(resolveRoutePermission('PUT', '/api/v1/settings/general'), [
      'settings.edit',
      'settings.view',
    ])
    assert.equal(resolveRoutePermission('GET', '/api/v1/settings/general'), 'settings.view')
    assert.equal(resolveRoutePermission('GET', '/api/v1/app-updates/latest'), 'settings.view')
    assert.equal(
      resolveRoutePermission('GET', '/api/v1/app-updates/download/desktop'),
      'settings.view'
    )
  })
})
