import type { QueryClient } from '@tanstack/react-query'

/** Dashboard (ventas del día, gráficos, KPIs). */
export function invalidateDashboard(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
}

/** Reportes (estado de cuenta y movimientos). */
export function invalidateReports(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['reports'] })
}

export function invalidateDashboardAndReports(queryClient: QueryClient) {
  invalidateDashboard(queryClient)
  invalidateReports(queryClient)
}

/** Tarjetas resumen del hub de Compras (compras + gastos). */
export function invalidatePurchasesHub(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['purchases'] })
  void queryClient.invalidateQueries({ queryKey: ['expenses'] })
  void queryClient.invalidateQueries({ queryKey: ['incomes'] })
}

/** Materiales y catálogo de productos. */
export function invalidateInventory(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['materials'] })
  void queryClient.invalidateQueries({ queryKey: ['catalog-products'] })
}

export function invalidateOrdersAndCustomers(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['orders'] })
  void queryClient.invalidateQueries({ queryKey: ['customers'] })
}

/** Ventas confirmadas, devoluciones y flujo de facturas con impacto financiero. */
export function invalidateSalesFinancials(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['sales'] })
  invalidateOrdersAndCustomers(queryClient)
  invalidateInventory(queryClient)
  invalidateDashboardAndReports(queryClient)
}

/** Compras confirmadas o devueltas (stock + finanzas). */
export function invalidatePurchasesFinancials(queryClient: QueryClient) {
  invalidatePurchasesHub(queryClient)
  void queryClient.invalidateQueries({ queryKey: ['suppliers'] })
  invalidateInventory(queryClient)
  invalidateDashboardAndReports(queryClient)
  void queryClient.invalidateQueries({ queryKey: ['orders'] })
}

/** Gastos de empresa. */
export function invalidateExpensesFinancials(queryClient: QueryClient) {
  invalidatePurchasesHub(queryClient)
  invalidateDashboardAndReports(queryClient)
}

/** Gastos de máquinas. */
export function invalidateMachineExpensesFinancials(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['machines'] })
  invalidateExpensesFinancials(queryClient)
}

/** Pagos a proveedores. */
export function invalidateSupplierPayments(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['suppliers'] })
  invalidatePurchasesFinancials(queryClient)
}

/** Cobros de clientes a crédito. */
export function invalidateCustomerPayments(queryClient: QueryClient) {
  invalidateOrdersAndCustomers(queryClient)
  invalidateDashboardAndReports(queryClient)
}

/** Movimientos de stock (materiales o productos). */
export function invalidateStockMovement(queryClient: QueryClient) {
  invalidateInventory(queryClient)
  invalidateDashboardAndReports(queryClient)
}

/** Cambios de precio en catálogo (margen de ganancia). */
export function invalidateCatalogPricing(queryClient: QueryClient) {
  invalidateInventory(queryClient)
  void queryClient.invalidateQueries({ queryKey: ['settings'] })
  invalidateDashboard(queryClient)
}
