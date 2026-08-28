import type { PermissionKey } from '#permissions/catalog'

type RouteRule = {
  method: string
  pattern: RegExp
  permission: PermissionKey | PermissionKey[]
}

const ROUTE_RULES: RouteRule[] = [
  { method: 'GET', pattern: /^\/dashboard\//, permission: 'dashboard.view' },
  { method: 'GET', pattern: /^\/dashboard$/, permission: 'dashboard.view' },

  { method: 'GET', pattern: /^\/sales-shifts(\/|$)/, permission: 'dashboard.view' },
  { method: 'POST', pattern: /^\/sales-shifts\/open$/, permission: 'ventas.confirm' },
  { method: 'POST', pattern: /^\/sales-shifts\/[^/]+\/close$/, permission: 'ventas.confirm' },

  { method: 'GET', pattern: /^\/sales(\/|$)/, permission: 'ventas.view' },
  { method: 'POST', pattern: /^\/sales\/[^/]+\/return$/, permission: 'ventas.returns' },
  { method: 'POST', pattern: /^\/sales(\/|$)/, permission: 'ventas.confirm' },
  { method: 'PUT', pattern: /^\/sales(\/|$)/, permission: 'ventas.confirm' },
  { method: 'DELETE', pattern: /^\/sales(\/|$)/, permission: 'ventas.confirm' },
  { method: 'GET', pattern: /^\/orders(\/|$)/, permission: 'ventas.view' },
  { method: 'POST', pattern: /^\/orders\/[^/]+\/return$/, permission: 'ventas.returns' },
  { method: 'POST', pattern: /^\/orders(\/|$)/, permission: 'ventas.confirm' },
  { method: 'PUT', pattern: /^\/orders(\/|$)/, permission: 'ventas.confirm' },
  { method: 'DELETE', pattern: /^\/orders(\/|$)/, permission: 'ventas.confirm' },

  { method: 'GET', pattern: /^\/customers(\/|$)/, permission: 'customers.view' },
  { method: 'POST', pattern: /^\/customers\/[^/]+\/payments$/, permission: 'customers.payments' },
  { method: 'POST', pattern: /^\/customers(\/|$)/, permission: 'customers.edit' },
  { method: 'PUT', pattern: /^\/customers(\/|$)/, permission: 'customers.edit' },
  { method: 'DELETE', pattern: /^\/customers(\/|$)/, permission: 'customers.edit' },

  { method: 'GET', pattern: /^\/suppliers(\/|$)/, permission: 'suppliers.view' },
  { method: 'POST', pattern: /^\/suppliers\/[^/]+\/payments$/, permission: 'suppliers.payments' },
  { method: 'POST', pattern: /^\/suppliers(\/|$)/, permission: 'suppliers.edit' },
  { method: 'PUT', pattern: /^\/suppliers(\/|$)/, permission: 'suppliers.edit' },
  { method: 'DELETE', pattern: /^\/suppliers(\/|$)/, permission: 'suppliers.edit' },

  { method: 'GET', pattern: /^\/catalog-products(\/|$)/, permission: 'catalog.view' },
  {
    method: 'POST',
    pattern: /^\/catalog-products\/apply-profit-margin$/,
    permission: 'catalog.pricing',
  },
  { method: 'POST', pattern: /^\/catalog-products(\/|$)/, permission: 'catalog.edit' },
  { method: 'PUT', pattern: /^\/catalog-products(\/|$)/, permission: 'catalog.edit' },
  { method: 'DELETE', pattern: /^\/catalog-products(\/|$)/, permission: 'catalog.edit' },

  { method: 'GET', pattern: /^\/formulas(\/|$)/, permission: 'catalog.view' },
  { method: 'POST', pattern: /^\/formulas(\/|$)/, permission: 'catalog.edit' },
  { method: 'PUT', pattern: /^\/formulas(\/|$)/, permission: 'catalog.edit' },
  { method: 'DELETE', pattern: /^\/formulas(\/|$)/, permission: 'catalog.edit' },

  { method: 'GET', pattern: /^\/materials(\/|$)/, permission: 'materials.view' },
  { method: 'POST', pattern: /^\/materials\/[^/]+\/adjustment$/, permission: 'materials.adjust' },
  { method: 'POST', pattern: /^\/materials(\/|$)/, permission: 'materials.edit' },
  { method: 'PUT', pattern: /^\/materials(\/|$)/, permission: 'materials.edit' },
  { method: 'DELETE', pattern: /^\/materials(\/|$)/, permission: 'materials.edit' },

  { method: 'GET', pattern: /^\/machines(\/|$)/, permission: 'machines.view' },
  { method: 'GET', pattern: /^\/machine-expenses(\/|$)/, permission: 'machines.view' },
  { method: 'POST', pattern: /^\/machines(\/|$)/, permission: 'machines.edit' },
  { method: 'PUT', pattern: /^\/machines(\/|$)/, permission: 'machines.edit' },
  { method: 'DELETE', pattern: /^\/machines(\/|$)/, permission: 'machines.edit' },
  { method: 'POST', pattern: /^\/machine-expenses(\/|$)/, permission: 'machines.edit' },
  { method: 'PUT', pattern: /^\/machine-expenses(\/|$)/, permission: 'machines.edit' },
  { method: 'DELETE', pattern: /^\/machine-expenses(\/|$)/, permission: 'machines.edit' },

  { method: 'GET', pattern: /^\/purchases(\/|$)/, permission: 'purchases.view' },
  { method: 'POST', pattern: /^\/purchases\/[^/]+\/confirm$/, permission: 'purchases.confirm' },
  { method: 'POST', pattern: /^\/purchases(\/|$)/, permission: 'purchases.edit' },
  { method: 'PUT', pattern: /^\/purchases(\/|$)/, permission: 'purchases.edit' },
  { method: 'DELETE', pattern: /^\/purchases(\/|$)/, permission: 'purchases.edit' },

  { method: 'GET', pattern: /^\/expenses(\/|$)/, permission: 'expenses.view' },
  { method: 'POST', pattern: /^\/expenses(\/|$)/, permission: 'expenses.edit' },
  { method: 'PUT', pattern: /^\/expenses(\/|$)/, permission: 'expenses.edit' },
  { method: 'DELETE', pattern: /^\/expenses(\/|$)/, permission: 'expenses.edit' },
  { method: 'GET', pattern: /^\/incomes(\/|$)/, permission: 'incomes.view' },
  { method: 'POST', pattern: /^\/incomes(\/|$)/, permission: 'incomes.edit' },
  { method: 'PUT', pattern: /^\/incomes(\/|$)/, permission: 'incomes.edit' },
  { method: 'DELETE', pattern: /^\/incomes(\/|$)/, permission: 'incomes.edit' },

  { method: 'GET', pattern: /^\/reports(\/|$)/, permission: 'reports.view' },

  { method: 'GET', pattern: /^\/settings(\/|$)/, permission: 'settings.view' },
  {
    method: 'PUT',
    pattern: /^\/settings(\/|$)/,
    permission: ['settings.edit', 'settings.view'],
  },
  {
    method: 'POST',
    pattern: /^\/settings(\/|$)/,
    permission: ['settings.edit', 'settings.view'],
  },
  {
    method: 'DELETE',
    pattern: /^\/settings(\/|$)/,
    permission: ['settings.edit', 'settings.view'],
  },

  { method: 'GET', pattern: /^\/users(\/|$)/, permission: 'users.view' },
  { method: 'POST', pattern: /^\/users(\/|$)/, permission: 'users.manage' },
  { method: 'PUT', pattern: /^\/users(\/|$)/, permission: 'users.manage' },
  { method: 'PATCH', pattern: /^\/users(\/|$)/, permission: 'users.manage' },

  { method: 'GET', pattern: /^\/accounts(\/|$)/, permission: 'purchases.view' },
  {
    method: 'POST',
    pattern: /^\/accounts(\/|$)/,
    permission: ['settings.edit', 'settings.view'],
  },
  {
    method: 'PUT',
    pattern: /^\/accounts(\/|$)/,
    permission: ['settings.edit', 'settings.view'],
  },
  {
    method: 'DELETE',
    pattern: /^\/accounts(\/|$)/,
    permission: ['settings.edit', 'settings.view'],
  },

  { method: 'GET', pattern: /^\/currencies(\/|$)/, permission: 'settings.view' },
  {
    method: 'POST',
    pattern: /^\/currencies(\/|$)/,
    permission: ['settings.edit', 'settings.view'],
  },
  {
    method: 'PUT',
    pattern: /^\/currencies(\/|$)/,
    permission: ['settings.edit', 'settings.view'],
  },
  {
    method: 'DELETE',
    pattern: /^\/currencies(\/|$)/,
    permission: ['settings.edit', 'settings.view'],
  },

  { method: 'GET', pattern: /^\/payment-methods(\/|$)/, permission: 'settings.view' },
  {
    method: 'POST',
    pattern: /^\/payment-methods(\/|$)/,
    permission: ['settings.edit', 'settings.view'],
  },
  {
    method: 'PUT',
    pattern: /^\/payment-methods(\/|$)/,
    permission: ['settings.edit', 'settings.view'],
  },
  {
    method: 'DELETE',
    pattern: /^\/payment-methods(\/|$)/,
    permission: ['settings.edit', 'settings.view'],
  },

  {
    method: 'GET',
    pattern: /^\/categories(\/|$)/,
    permission: ['catalog.view', 'settings.view'],
  },
  {
    method: 'POST',
    pattern: /^\/categories(\/|$)/,
    permission: ['catalog.edit', 'settings.edit', 'settings.view'],
  },
  {
    method: 'PUT',
    pattern: /^\/categories(\/|$)/,
    permission: ['catalog.edit', 'settings.edit', 'settings.view'],
  },
  {
    method: 'DELETE',
    pattern: /^\/categories(\/|$)/,
    permission: ['catalog.edit', 'settings.edit', 'settings.view'],
  },
]

const AUTH_ONLY_PATHS = new Set(['/auth/me', '/auth/logout'])

export type ResolvedRoutePermission = PermissionKey | PermissionKey[] | 'auth_only' | 'deny'

export function resolveRoutePermission(method: string, pathname: string): ResolvedRoutePermission {
  const path = pathname.replace(/^\/api\/v1/, '') || '/'

  if (AUTH_ONLY_PATHS.has(path)) {
    return 'auth_only'
  }

  for (const rule of ROUTE_RULES) {
    if (rule.method === method && rule.pattern.test(path)) {
      return rule.permission
    }
  }

  return 'deny'
}
