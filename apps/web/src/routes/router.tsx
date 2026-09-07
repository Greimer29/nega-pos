import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RedirectMaterialDetail } from '@/routes/redirect-material-detail'
import { RedirectOrderDetail } from '@/routes/redirect-order-detail'
import { GuestRoute, ProtectedRoute } from '@/components/auth/auth-route'
import { AppLayout } from '@/components/layout/app-layout'
import { DashboardPage } from '@/pages/dashboard-page'
import { DashboardDailyProductsPage } from '@/pages/dashboard-daily-products-page'
import { DashboardDailyExpensesPage } from '@/pages/dashboard-daily-expenses-page'
import { DashboardDailyClosingPage } from '@/pages/dashboard-daily-closing-page'
import { LoginPage } from '@/pages/login-page'
import { PlatformLoginPage } from '@/pages/platform-login-page'
import { PlatformPage } from '@/pages/platform-page'
import { MaterialsPage } from '@/pages/materials-page'
import { MaterialDetallePage } from '@/pages/material-detail-page'
import { ProductDetailPage } from '@/pages/product-detail-page'
import { ProductosPage } from '@/pages/productos-page'
import { PurchasesPage } from '@/pages/purchases-page'
import { PurchaseDetallePage } from '@/pages/purchase-detail-page'
import { SuppliersPage } from '@/pages/suppliers-page'
import { SupplierAccountPage } from '@/pages/supplier-account-page'
import { CustomersPage } from '@/pages/customers-page'
import { CustomerDetallePage } from '@/pages/customer-detail-page'
import { CustomerAccountPage } from '@/pages/customer-account-page'
import { VentasPage } from '@/pages/ventas-page'
import { OrderDetallePage } from '@/pages/order-detail-page'
import { SaleDetailPage } from '@/pages/sale-detail-page'
import { MachinesPage } from '@/pages/machines-page'
import { MachineDetailPage } from '@/pages/machine-detail-page'
import { ReportsPage } from '@/pages/reports-page'
import { ReportMovementsPage } from '@/pages/report-movements-page'
import { InventoryProductMovementsPage } from '@/pages/inventory-product-movements-page'
import { UsersPage } from '@/pages/users-page'
import { SettingsPage } from '@/pages/settings-page'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <GuestRoute>
        <LoginPage />
      </GuestRoute>
    ),
  },
  {
    path: '/platform/login',
    element: <PlatformLoginPage />,
  },
  {
    path: '/platform',
    element: <PlatformPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'dashboard/productos-vendidos-hoy',
        element: <DashboardDailyProductsPage />,
      },
      {
        path: 'dashboard/gastos-del-dia',
        element: <DashboardDailyExpensesPage />,
      },
      {
        path: 'dashboard/cierre-diario',
        element: <DashboardDailyClosingPage />,
      },
      {
        path: 'customers',
        element: <CustomersPage />,
      },
      {
        path: 'customers/:id/cuenta',
        element: <CustomerAccountPage />,
      },
      {
        path: 'customers/:id',
        element: <CustomerDetallePage />,
      },
      {
        path: 'ventas',
        element: <VentasPage />,
      },
      {
        path: 'ventas/pedidos',
        element: <Navigate to="/ventas" replace />,
      },
      {
        path: 'ventas/pedidos/:id',
        element: <RedirectOrderDetail />,
      },
      {
        path: 'ventas/facturacion',
        element: <Navigate to="/ventas" replace />,
      },
      {
        path: 'ventas/:id',
        element: <SaleDetailPage />,
      },
      {
        path: 'orders',
        element: <Navigate to="/ventas" replace />,
      },
      {
        path: 'orders/:id',
        element: <OrderDetallePage />,
      },
      {
        path: 'machines',
        element: <MachinesPage />,
      },
      {
        path: 'machines/:id',
        element: <MachineDetailPage />,
      },
      {
        path: 'suppliers',
        element: <SuppliersPage />,
      },
      {
        path: 'suppliers/:id/cuenta',
        element: <SupplierAccountPage />,
      },
      {
        path: 'productos',
        element: <ProductosPage />,
      },
      {
        path: 'productos/:id',
        element: <ProductDetailPage />,
      },
      {
        path: 'productos/materiales',
        element: <MaterialsPage />,
      },
      {
        path: 'productos/materiales/:id',
        element: <MaterialDetallePage />,
      },
      {
        path: 'materials',
        element: <Navigate to="/productos/materiales" replace />,
      },
      {
        path: 'materials/:id',
        element: <RedirectMaterialDetail />,
      },
      {
        path: 'purchases',
        element: <PurchasesPage />,
      },
      {
        path: 'purchases/:id',
        element: <PurchaseDetallePage />,
      },
      {
        path: 'reportes',
        element: <ReportsPage />,
      },
      {
        path: 'reportes/inventario/:productId',
        element: <InventoryProductMovementsPage />,
      },
      {
        path: 'reportes/movimientos/:category',
        element: <ReportMovementsPage />,
      },
      {
        path: 'users',
        element: <UsersPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'settings/ventas',
        element: <Navigate to="/settings?tab=ventas" replace />,
      },
      {
        path: 'settings/formatos',
        element: <Navigate to="/settings?tab=formatos" replace />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])
