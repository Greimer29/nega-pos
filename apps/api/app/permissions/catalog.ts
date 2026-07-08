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

const ALL_PERMISSIONS = Object.values(PERMISSION_GROUPS).flatMap((group) =>
  Object.keys(group.permissions)
) as PermissionKey[]

export function allPermissions(): PermissionKey[] {
  return [...ALL_PERMISSIONS]
}

export function isValidPermission(value: string): value is PermissionKey {
  return ALL_PERMISSIONS.includes(value as PermissionKey)
}

export function sanitizePermissions(values: string[] | null | undefined): PermissionKey[] {
  if (!values?.length) return []
  return values.filter(isValidPermission)
}

export function userHasPermission(
  role: string,
  permissions: string[] | null | undefined,
  permission: PermissionKey
): boolean {
  if (role === 'ADMIN') return true
  return sanitizePermissions(permissions).includes(permission)
}

export function effectivePermissions(
  role: string,
  permissions: string[] | null | undefined
): PermissionKey[] | ['*'] {
  if (role === 'ADMIN') return ['*']
  return sanitizePermissions(permissions)
}
