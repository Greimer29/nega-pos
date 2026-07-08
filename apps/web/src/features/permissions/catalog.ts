export const PERMISSION_GROUPS = {
  dashboard: {
    label: 'Dashboard',
    permissions: {
      'dashboard.view': 'Ver panel principal',
    },
  },
  ventas: {
    label: 'Ventas',
    permissions: {
      'ventas.view': 'Ver ventas y pedidos',
      'ventas.confirm': 'Confirmar ventas / facturar',
      'ventas.credit': 'Ventas a crédito',
      'ventas.returns': 'Registrar devoluciones',
    },
  },
  customers: {
    label: 'Clientes',
    permissions: {
      'customers.view': 'Ver clientes',
      'customers.edit': 'Crear y editar clientes',
      'customers.payments': 'Registrar abonos de crédito',
    },
  },
  suppliers: {
    label: 'Proveedores',
    permissions: {
      'suppliers.view': 'Ver proveedores',
      'suppliers.edit': 'Crear y editar proveedores',
      'suppliers.payments': 'Registrar abonos a proveedores',
    },
  },
  catalog: {
    label: 'Productos',
    permissions: {
      'catalog.view': 'Ver catálogo de productos',
      'catalog.edit': 'Crear y editar productos',
      'catalog.pricing': 'Aplicar margen / precios masivos',
    },
  },
  materials: {
    label: 'Materiales',
    permissions: {
      'materials.view': 'Ver materiales',
      'materials.edit': 'Crear y editar materiales',
      'materials.adjust': 'Ajustes manuales de stock',
    },
  },
  machines: {
    label: 'Maquinaria',
    permissions: {
      'machines.view': 'Ver máquinas y gastos',
      'machines.edit': 'Crear y editar máquinas y gastos',
    },
  },
  purchases: {
    label: 'Compras',
    permissions: {
      'purchases.view': 'Ver compras',
      'purchases.edit': 'Crear y editar compras',
      'purchases.confirm': 'Confirmar compras',
    },
  },
  expenses: {
    label: 'Gastos',
    permissions: {
      'expenses.view': 'Ver gastos',
      'expenses.edit': 'Crear y editar gastos',
    },
  },
  reports: {
    label: 'Reportes',
    permissions: {
      'reports.view': 'Ver reportes',
    },
  },
  settings: {
    label: 'Configuración',
    permissions: {
      'settings.view': 'Ver tasa y margen',
      'settings.edit': 'Editar tasa y margen',
    },
  },
  users: {
    label: 'Usuarios',
    permissions: {
      'users.view': 'Ver usuarios',
      'users.manage': 'Gestionar usuarios y permisos',
    },
  },
} as const

export type PermissionKey = {
  [G in keyof typeof PERMISSION_GROUPS]: keyof (typeof PERMISSION_GROUPS)[G]['permissions']
}[keyof typeof PERMISSION_GROUPS]

export type PermissionPresetId = 'vendedor' | 'inventario' | 'contador' | 'custom'

export const PERMISSION_PRESETS: Record<
  Exclude<PermissionPresetId, 'custom'>,
  { label: string; permissions: PermissionKey[] }
> = {
  vendedor: {
    label: 'Vendedor',
    permissions: [
      'dashboard.view',
      'ventas.view',
      'ventas.confirm',
      'ventas.credit',
      'ventas.returns',
      'customers.view',
      'customers.edit',
    ],
  },
  inventario: {
    label: 'Inventario',
    permissions: [
      'dashboard.view',
      'catalog.view',
      'catalog.edit',
      'catalog.pricing',
      'materials.view',
      'materials.edit',
      'materials.adjust',
      'purchases.view',
      'purchases.edit',
    ],
  },
  contador: {
    label: 'Contador',
    permissions: [
      'dashboard.view',
      'reports.view',
      'purchases.view',
      'purchases.confirm',
      'expenses.view',
      'expenses.edit',
      'suppliers.view',
      'suppliers.payments',
      'customers.view',
      'customers.payments',
      'settings.view',
    ],
  },
}

export const NAV_PERMISSIONS: Record<string, PermissionKey> = {
  '/dashboard': 'dashboard.view',
  '/ventas': 'ventas.view',
  '/customers': 'customers.view',
  '/suppliers': 'suppliers.view',
  '/productos': 'catalog.view',
  '/productos/materiales': 'materials.view',
  '/machines': 'machines.view',
  '/purchases': 'purchases.view',
  '/reportes': 'reports.view',
  '/users': 'users.view',
  '/settings': 'settings.view',
}

const ROUTE_RULES: Array<{ pattern: RegExp; permission: PermissionKey }> = [
  { pattern: /^\/dashboard/, permission: 'dashboard.view' },
  { pattern: /^\/ventas/, permission: 'ventas.view' },
  { pattern: /^\/customers/, permission: 'customers.view' },
  { pattern: /^\/suppliers/, permission: 'suppliers.view' },
  { pattern: /^\/productos\/materiales/, permission: 'materials.view' },
  { pattern: /^\/productos/, permission: 'catalog.view' },
  { pattern: /^\/machines/, permission: 'machines.view' },
  { pattern: /^\/purchases/, permission: 'purchases.view' },
  { pattern: /^\/reportes/, permission: 'reports.view' },
  { pattern: /^\/users/, permission: 'users.view' },
  { pattern: /^\/settings/, permission: 'settings.view' },
]

export function resolvePagePermission(pathname: string): PermissionKey | null {
  for (const rule of ROUTE_RULES) {
    if (rule.pattern.test(pathname)) {
      return rule.permission
    }
  }
  return null
}

export function canAccess(
  role: string | undefined,
  permissions: string[] | undefined,
  permission: PermissionKey
): boolean {
  if (!role) return false
  if (role === 'ADMIN') return true
  if (permissions?.includes('*')) return true
  return permissions?.includes(permission) ?? false
}

export function canAccessNav(
  role: string | undefined,
  permissions: string[] | undefined,
  pathPrefix: string
): boolean {
  const permission = NAV_PERMISSIONS[pathPrefix]
  if (!permission) return true
  return canAccess(role, permissions, permission)
}
