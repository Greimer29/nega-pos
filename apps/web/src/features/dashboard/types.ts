export type BajoStockItem = {
  id: number
  code: string
  name: string
  category: string
  unit: string
  minimumStock: string
  stockActual: number
}

export type BajoStockProductoItem = {
  id: number
  name: string
  stock: string
  minimumStock: string
  saleUnit: string
}

export type VentasDelDia = {
  productosVendidos: number
  montoProductosUsd: string
  montoCreditoUsd: string
  pedidosCredito: number
  gastosCantidad: number
  gastosMontoUsd: string
}

export type GananciaDelDia = {
  montoUsd: string
  gananciaCreditoUsd: string
  porcentajeSobreVentas: number
}

export type VentasSeriePoint = {
  label: string
  totalUsd: string
  variacionPct: number | null
}

export type ClienteCreditoItem = {
  id: number
  name: string
  pedidosConSaldo: number
  saldoPendienteUsd: string
  estado: 'vigente' | 'vencida'
}

export type ProveedorCreditoItem = {
  id: number
  name: string
  saldoPendienteUsd: string
  estado: 'vigente' | 'vencida'
}

export type DashboardOverview = {
  bajoStock: BajoStockItem[]
  bajoStockProductos: BajoStockProductoItem[]
  purchasesMonth: { quantity: number; totalUsd: string }
  machineExpensesMonth: { quantity: number; totalAmount: string }
  ventasDelDia: VentasDelDia
  gananciaDelDia: GananciaDelDia
  ventasSeries: VentasSeriePoint[]
  clientesCredito: ClienteCreditoItem[]
  proveedoresCredito: ProveedorCreditoItem[]
}

export type DashboardOverviewResponse = {
  data: DashboardOverview
}

export type DashboardChartMode = 'daily' | 'weekly' | 'monthly'

export type DailySoldProduct = {
  id: number
  name: string
  category: string
  sale_unit: string
  image_path: string | null
  stock_quantity: string
  quantity_sold: number
  unit_price_usd: string
  total_usd: string
}

export type DailyProductSales = {
  date: string
  products: DailySoldProduct[]
  summary: {
    productos_vendidos: number
    monto_productos_usd: string
  }
}

export type DailyProductSalesResponse = {
  data: DailyProductSales
}

export type DailyExpenseItem = {
  id: number
  kind: 'expense' | 'machine_expense'
  description: string
  amount_usd: string
  machine_name: string | null
  category: string | null
}

export type DailyExpenses = {
  date: string
  items: DailyExpenseItem[]
  summary: {
    gastos_cantidad: number
    gastos_monto_usd: string
  }
}

export type DailyExpensesResponse = {
  data: DailyExpenses
}

export type DailyClosingPaymentMethod = {
  code: string
  name: string
  currency_code: string
  sales_count: number
  total_usd: string
  total_in_currency: string | null
}

export type DailyClosingInvoice = {
  id: number
  code: string | null
  customer_name: string
  payment_type: string
  payment_method_code: string | null
  payment_method_name: string | null
  total_usd: string
  total_bs: string | null
  status: string
}

export type DailyClosingReturn = {
  sale_id: number
  sale_code: string | null
  returned_at: string
  total_returned_usd: string
}

export type DailyClosing = {
  date: string
  summary: {
    invoices_count: number
    returns_count: number
    cash_total_usd: string
    credit_total_usd: string
    products_sold: number
    products_amount_usd: string
  }
  by_payment_method: DailyClosingPaymentMethod[]
  products: DailySoldProduct[]
  invoices: DailyClosingInvoice[]
  returns: DailyClosingReturn[]
}

export type DailyClosingResponse = {
  data: DailyClosing
}
