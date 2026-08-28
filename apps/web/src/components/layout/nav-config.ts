import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Banknote,
  FlaskConical,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Shield,
  Truck,
  Users,
  Wrench,
} from 'lucide-react'

export type NavLinkItem = {
  to: string
  label: string
  icon: LucideIcon
  navPath: string
  match?: (pathname: string) => boolean
}

export type NavEntry =
  | { type: 'link'; item: NavLinkItem }
  | { type: 'group'; id: string; label: string; icon: LucideIcon; items: NavLinkItem[] }

export const navEntries: NavEntry[] = [
  {
    type: 'link',
    item: { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, navPath: '/dashboard' },
  },
  {
    type: 'link',
    item: {
      to: '/ventas',
      label: 'Ventas',
      icon: Banknote,
      navPath: '/ventas',
      match: (pathname) => pathname.startsWith('/ventas'),
    },
  },
  {
    type: 'link',
    item: { to: '/customers', label: 'Clientes', icon: Users, navPath: '/customers' },
  },
  {
    type: 'link',
    item: { to: '/suppliers', label: 'Proveedores', icon: Truck, navPath: '/suppliers' },
  },
  {
    type: 'group',
    id: 'productos',
    label: 'Productos',
    icon: Package,
    items: [
      {
        to: '/productos',
        label: 'Productos',
        icon: Package,
        navPath: '/productos',
        match: (pathname) =>
          pathname === '/productos' ||
          (pathname.startsWith('/productos') && !pathname.startsWith('/productos/materiales')),
      },
      {
        to: '/productos/materiales',
        label: 'Materiales',
        icon: FlaskConical,
        navPath: '/productos/materiales',
        match: (pathname) => pathname.startsWith('/productos/materiales'),
      },
      {
        to: '/machines',
        label: 'Maquinaria',
        icon: Wrench,
        navPath: '/machines',
        match: (pathname) => pathname.startsWith('/machines'),
      },
    ],
  },
  {
    type: 'link',
    item: { to: '/purchases', label: 'Compras', icon: ShoppingCart, navPath: '/purchases' },
  },
  {
    type: 'link',
    item: {
      to: '/reportes',
      label: 'Reportes',
      icon: BarChart3,
      navPath: '/reportes',
      match: (pathname) => pathname.startsWith('/reportes'),
    },
  },
  {
    type: 'link',
    item: { to: '/users', label: 'Usuarios', icon: Shield, navPath: '/users' },
  },
  {
    type: 'link',
    item: {
      to: '/settings',
      label: 'Configuración',
      icon: Settings,
      navPath: '/settings',
      match: (pathname) => pathname.startsWith('/settings'),
    },
  },
]
