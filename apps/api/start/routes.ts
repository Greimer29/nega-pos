/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
const FormulasController = () => import('#controllers/formulas_controller')
const CatalogProductsController = () => import('#controllers/catalog_products_controller')
const SalesController = () => import('#controllers/sales_controller')
const SalesShiftsController = () => import('#controllers/sales_shifts_controller')
const ExpensesController = () => import('#controllers/expenses_controller')
const IncomesController = () => import('#controllers/incomes_controller')
const SettingsController = () => import('#controllers/settings_controller')
const AccountsController = () => import('#controllers/accounts_controller')
const CurrenciesController = () => import('#controllers/currencies_controller')
const ReportsController = () => import('#controllers/reports_controller')
const CategoriesController = () => import('#controllers/categories_controller')
const CsrfController = () => import('#controllers/csrf_controller')
const UsersController = () => import('#controllers/users_controller')

router.get('/health', [controllers.Health, 'show'])

const PlatformController = () => import('#controllers/platform_controller')

router
  .group(() => {
    router.get('csrf', [CsrfController, 'show'])
    router.post('auth/login', [controllers.Auth, 'login'])
    router.post('auth/google', [controllers.Auth, 'google'])

    router
      .group(() => {
        router.post('auth/login', [PlatformController, 'login'])
        router.post('auth/logout', [PlatformController, 'logout'])
        router.get('auth/me', [PlatformController, 'me'])

        router
          .group(() => {
            router.get('companies', [PlatformController, 'listCompanies'])
            router.post('companies', [PlatformController, 'createCompany'])
            router.post('companies/:id/retry', [PlatformController, 'retryProvision'])
            router.patch('companies/:id/status', [PlatformController, 'updateCompanyStatus'])
            router.delete('companies/:id', [PlatformController, 'destroyCompany'])
          })
          .use(middleware.platformAuth())
      })
      .prefix('platform')

    router
      .group(() => {
        router.post('auth/logout', [controllers.Auth, 'logout'])
        router.get('auth/me', [controllers.Auth, 'me'])

        router.get('customers', [controllers.Customers, 'index'])
        router.get('customers/:id/account-statement', [controllers.Customers, 'accountStatement'])
        router.get('customers/:id', [controllers.Customers, 'show'])
        router.post('customers', [controllers.Customers, 'store'])
        router.put('customers/:id', [controllers.Customers, 'update'])
        router.delete('customers/:id', [controllers.Customers, 'destroy'])
        router.post('customers/:id/image', [controllers.Customers, 'uploadImage'])
        router.get('customers/:id/image', [controllers.Customers, 'downloadImage'])
        router.delete('customers/:id/image', [controllers.Customers, 'deleteImage'])
        router.post('customers/:id/payments', [controllers.Customers, 'storePayment'])

        router.get('orders', [controllers.Orders, 'index'])
        router.get('orders/:id', [controllers.Orders, 'show'])
        router.post('orders', [controllers.Orders, 'store'])
        router.put('orders/:id', [controllers.Orders, 'update'])
        router.delete('orders/:id', [controllers.Orders, 'destroy'])
        router.post('orders/:id/transition', [controllers.Orders, 'transition'])
        router.post('orders/:id/return', [controllers.Orders, 'devolver'])
        router.post('orders/:id/materials', [controllers.Orders, 'storeMaterial'])
        router.put('orders/:id/materials/:pmId', [controllers.Orders, 'updateMaterial'])
        router.delete('orders/:id/materials/:pmId', [controllers.Orders, 'destroyMaterial'])
        router.post('orders/:id/lines', [controllers.Orders, 'storeLine'])
        router.put('orders/:id/lines/:lineId', [controllers.Orders, 'updateLine'])
        router.delete('orders/:id/lines/:lineId', [controllers.Orders, 'destroyLine'])
        router.get('orders/:id/budget', [controllers.Orders, 'budget'])
        router.get('orders/:id/material-availability', [controllers.Orders, 'materialAvailability'])
        router.post('orders/:id/reference', [controllers.Orders, 'uploadReferencia'])
        router.get('orders/:id/reference', [controllers.Orders, 'downloadReferencia'])

        router.get('suppliers', [controllers.Suppliers, 'index'])
        router.get('suppliers/:id', [controllers.Suppliers, 'show'])
        router.post('suppliers', [controllers.Suppliers, 'store'])
        router.put('suppliers/:id', [controllers.Suppliers, 'update'])
        router.delete('suppliers/:id', [controllers.Suppliers, 'destroy'])
        router.post('suppliers/:id/image', [controllers.Suppliers, 'uploadImage'])
        router.get('suppliers/:id/image', [controllers.Suppliers, 'downloadImage'])
        router.delete('suppliers/:id/image', [controllers.Suppliers, 'deleteImage'])
        router.get('suppliers/:id/account-statement', [controllers.Suppliers, 'accountStatement'])
        router.post('suppliers/:id/payments', [controllers.Suppliers, 'storePayment'])

        router.get('materials', [controllers.Materials, 'index'])
        router.get('materials/:id', [controllers.Materials, 'show'])
        router.post('materials', [controllers.Materials, 'store'])
        router.put('materials/:id', [controllers.Materials, 'update'])
        router.delete('materials/:id', [controllers.Materials, 'destroy'])
        router.post('materials/:id/adjustment', [controllers.Materials, 'ajuste'])
        router.get('materials/:id/price-history', [controllers.Materials, 'historialPrecios'])
        router.post('materials/:id/image', [controllers.Materials, 'uploadImage'])
        router.get('materials/:id/image', [controllers.Materials, 'downloadImage'])
        router.delete('materials/:id/image', [controllers.Materials, 'deleteImage'])

        router.get('purchases/summary', [controllers.Purchases, 'summary'])
        router.get('purchases', [controllers.Purchases, 'index'])
        router.get('purchases/:id', [controllers.Purchases, 'show'])
        router.post('purchases', [controllers.Purchases, 'store'])
        router.put('purchases/:id', [controllers.Purchases, 'update'])
        router.delete('purchases/:id', [controllers.Purchases, 'destroy'])
        router.post('purchases/:id/confirm', [controllers.Purchases, 'confirmar'])
        router.post('purchases/:id/return', [controllers.Purchases, 'devolver'])
        router.post('purchases/:id/invoice', [controllers.Purchases, 'uploadFactura'])
        router.get('purchases/:id/invoice', [controllers.Purchases, 'downloadFactura'])
        router.post('purchases/:id/items', [controllers.Purchases, 'storeItem'])
        router.put('purchases/:id/items/:itemId', [controllers.Purchases, 'updateItem'])
        router.delete('purchases/:id/items/:itemId', [controllers.Purchases, 'destroyItem'])

        router.get('expenses/summary', [ExpensesController, 'summary'])
        router.get('expenses', [ExpensesController, 'index'])
        router.post('expenses', [ExpensesController, 'store'])
        router.put('expenses/:id', [ExpensesController, 'update'])
        router.delete('expenses/:id', [ExpensesController, 'destroy'])

        router.get('incomes/summary', [IncomesController, 'summary'])
        router.get('incomes', [IncomesController, 'index'])
        router.post('incomes', [IncomesController, 'store'])
        router.put('incomes/:id', [IncomesController, 'update'])
        router.delete('incomes/:id', [IncomesController, 'destroy'])

        router.get('accounts', [AccountsController, 'index'])
        router.get('accounts/:id', [AccountsController, 'show'])
        router.post('accounts', [AccountsController, 'store'])
        router.put('accounts/:id', [AccountsController, 'update'])
        router.delete('accounts/:id', [AccountsController, 'destroy'])

        router.get('currencies', [CurrenciesController, 'index'])
        router.get('currencies/base', [CurrenciesController, 'getBaseCurrency'])
        router.put('currencies/base', [CurrenciesController, 'updateBaseCurrency'])
        router.post('currencies', [CurrenciesController, 'store'])
        router.put('currencies/:code', [CurrenciesController, 'update'])
        router.delete('currencies/:code', [CurrenciesController, 'destroy'])

        const PaymentMethodsController = () => import('#controllers/payment_methods_controller')
        router.get('payment-methods', [PaymentMethodsController, 'index'])
        router.post('payment-methods', [PaymentMethodsController, 'store'])
        router.put('payment-methods/:code', [PaymentMethodsController, 'update'])
        router.delete('payment-methods/:code', [PaymentMethodsController, 'destroy'])

        router.get('categories', [CategoriesController, 'index'])
        router.post('categories', [CategoriesController, 'store'])
        router.put('categories/:id', [CategoriesController, 'update'])
        router.delete('categories/:id', [CategoriesController, 'destroy'])

        router.get('reports/account-statement', [ReportsController, 'accountStatement'])
        router.get('reports/inventory', [ReportsController, 'inventory'])
        router.get('reports/inventory/:productId/movements', [ReportsController, 'inventoryMovements'])

        router.get('settings/exchange-rate', [SettingsController, 'getExchangeRate'])
        router.put('settings/exchange-rate', [SettingsController, 'updateExchangeRate'])
        router.get('settings/profit-margin', [SettingsController, 'getProfitMargin'])
        router.put('settings/profit-margin', [SettingsController, 'updateProfitMargin'])
        router.get('settings/general', [SettingsController, 'getGeneral'])
        router.put('settings/general', [SettingsController, 'updateGeneral'])
        router.post('settings/general/logo', [SettingsController, 'uploadLogo'])
        router.get('settings/general/logo', [SettingsController, 'downloadLogo'])
        router.delete('settings/general/logo', [SettingsController, 'deleteLogo'])
        router.get('settings/printing', [SettingsController, 'getPrinting'])
        router.put('settings/printing', [SettingsController, 'updatePrinting'])

        router.get('dashboard/summary', [controllers.Dashboard, 'resumen'])
        router.get('dashboard/overview', [controllers.Dashboard, 'overview'])
        router.get('dashboard/daily-product-sales', [controllers.Dashboard, 'dailyProductSales'])
        router.get('dashboard/daily-expenses', [controllers.Dashboard, 'dailyExpenses'])
        router.get('dashboard/daily-closing', [controllers.Dashboard, 'dailyClosing'])

        router.get('sales-shifts/current', [SalesShiftsController, 'current'])
        router.get('sales-shifts', [SalesShiftsController, 'index'])
        router.post('sales-shifts/open', [SalesShiftsController, 'open'])
        router.post('sales-shifts/:id/close', [SalesShiftsController, 'close'])

        router.get('machines', [controllers.Machines, 'index'])
        router.get('machines/:id', [controllers.Machines, 'show'])
        router.post('machines', [controllers.Machines, 'store'])
        router.put('machines/:id', [controllers.Machines, 'update'])
        router.delete('machines/:id', [controllers.Machines, 'destroy'])
        router.get('machines/:id/expenses', [controllers.Machines, 'indexExpenses'])
        router.post('machines/:id/expenses', [controllers.Machines, 'storeExpense'])

        router.get('machine-expenses', [controllers.MachineExpenses, 'index'])
        router.put('machine-expenses/:id', [controllers.MachineExpenses, 'update'])
        router.delete('machine-expenses/:id', [controllers.MachineExpenses, 'destroy'])
        router.post('machine-expenses/:id/receipt', [
          controllers.MachineExpenses,
          'uploadComprobante',
        ])
        router.get('machine-expenses/:id/receipt', [
          controllers.MachineExpenses,
          'downloadComprobante',
        ])

        router.get('catalog-products', [CatalogProductsController, 'index'])
        router.post('catalog-products/apply-profit-margin', [
          CatalogProductsController,
          'applyProfitMargin',
        ])
        router.post('catalog-products/bulk-adjustment', [
          CatalogProductsController,
          'ajusteMasivo',
        ])
        router.get('catalog-products/:id', [CatalogProductsController, 'show'])
        router.post('catalog-products/:id/adjustment', [CatalogProductsController, 'ajuste'])
        router.post('catalog-products', [CatalogProductsController, 'store'])
        router.put('catalog-products/:id', [CatalogProductsController, 'update'])
        router.put('catalog-products/:id/sizes', [CatalogProductsController, 'replaceSizes'])
        router.delete('catalog-products/:id', [CatalogProductsController, 'destroy'])
        router.post('catalog-products/:id/image', [CatalogProductsController, 'uploadImage'])
        router.get('catalog-products/:id/image', [CatalogProductsController, 'downloadImage'])
        router.delete('catalog-products/:id/image', [CatalogProductsController, 'deleteImage'])

        router.get('formulas', [FormulasController, 'index'])
        router.get('formulas/:id', [FormulasController, 'show'])
        router.post('formulas', [FormulasController, 'store'])
        router.put('formulas/:id', [FormulasController, 'update'])
        router.delete('formulas/:id', [FormulasController, 'destroy'])
        router.get('formulas/:id/materials', [FormulasController, 'getMaterials'])
        router.put('formulas/:id/materials', [FormulasController, 'updateMaterials'])

        router.get('users', [UsersController, 'index'])
        router.get('users/:id', [UsersController, 'show'])
        router.post('users', [UsersController, 'store'])
        router.put('users/:id', [UsersController, 'update'])
        router.patch('users/:id/active', [UsersController, 'updateActive'])

        router.get('sales/next-code', [SalesController, 'nextCode'])
        router.get('sales', [SalesController, 'index'])
        router.get('sales/:id', [SalesController, 'show'])
        router.post('sales', [SalesController, 'store'])
        router.put('sales/:id', [SalesController, 'update'])
        router.delete('sales/:id', [SalesController, 'destroy'])
        router.post('sales/:id/confirm', [SalesController, 'confirm'])
        router.post('sales/:id/transition', [SalesController, 'transition'])
        router.post('sales/:id/return', [SalesController, 'returnSale'])
      })
      .use(middleware.auth({ guards: ['web'] }))
      .use(middleware.permission())
  })
  .prefix('/api/v1')
